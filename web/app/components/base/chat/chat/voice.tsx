import 'regenerator-runtime/runtime';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useChatWithHistoryContext } from '../chat-with-history/context'
import VoiceActivityEmitter from 'voice-activity-emitter';
import toWav from 'audiobuffer-to-wav';
import { textToAudio } from '@/service/share'
import { useMicVAD } from "@ricky0123/vad-react"



const SPEECH_RECOGNITION_API_URL = process.env.NEXT_PUBLIC_SPEECH_RECOGNITION_API_URL;
const SPEECH_SYNTHESIS_API_URL = process.env.NEXT_PUBLIC_SPEECH_SYNTHESIS_API_URL;
const AK = process.env.NEXT_PUBLIC_BAIDU_API_AK;
const SK = process.env.NEXT_PUBLIC_BAIDU_API_SK;

type VoiceType = {
    onClose: () => void,
    onVoiceEnd: (text: string) => void

}
const removeCodeBlocks = (inputText: any) => {
    const codeBlockRegex = /```[\s\S]*?```/g
    if (inputText)
        return inputText.replace(codeBlockRegex, '')
    return ''
}




const Voice: React.FC<VoiceType> = ({ onClose, onVoiceEnd }) => {
    const { appData } = useChatWithHistoryContext();
    const [startListening, setStartListening] = useState(true);
    const [isInit, setIsInit] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const vad = useMicVAD({
        startOnLoad: true,
        onSpeechStart: () => {
            console.log("START")
        },
        onSpeechEnd: (audio) => {
            console.log("User stopped talking")
        },
    })

    function handleSegment(audioBuffer: AudioBuffer) {
        console.log(audioBuffer, 111)
        if ((!!window.enableEmitter) && !isInit) {
            setEnableEmitter(false);
            const blob = new Blob([toWav(audioBuffer)]);
            //const blob = audiobufferToBlob(audioBuffer,{bitrate:128});
            //const mp3Blob = new Blob([blob], { type: 'audio/mp3' });
            const formData = new FormData()
            formData.append('file', blob, 'audio.wav');
            //formData.append('file', mp3Blob, 'audio.mp3');

            const url = SPEECH_RECOGNITION_API_URL + `?AK=${AK}&SK=${SK}&t=${new Date()}`;
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('post', url)
                xhr.send(formData);
                xhr.onload = function () {
                    if (xhr.status == 200) {
                        const result = JSON.parse(xhr.responseText);
                        const text = result.text;
                        onVoiceEnd(text || '');
                        console.log(startListening, audioBuffer, text);

                    } else {
                    }
                    playAudio();
                }
            } catch (e) {
                setEnableEmitter(true);
            }
        }
    }
    //播放
    const playAudio = async (text) => {
        if (!!window.playing) {
            return;
        }
        window.playing = true;
        const formData = new FormData()

        formData.append('text', removeCodeBlocks(text))
        formData.append('voice', 'alloy')

        let url = '/text-to-audio'
        let isPublic = true

        try {
            const audioResponse = await textToAudio(url, isPublic, formData)//语音合成
            const blob_bytes = Buffer.from(audioResponse.data, 'latin1')
            const blob = new Blob([blob_bytes], { type: 'audio/wav' })
            const audioUrl = URL.createObjectURL(blob)
            const audio = new Audio(audioUrl)
            audioRef.current = audio
            audio.play().then(() => { }).catch(() => {
                URL.revokeObjectURL(audioUrl)
            })
            audio.onended = () => {
                console.log('播放完了')
            }
            window.playing = false;
        } catch (error) {
            console.error('Error playing audio:', error)
            window.playing = false;
        } finally {
            setEnableEmitter(true);
        }

    }

    const setEnableEmitter = (value) => {
        window['enableEmitter'] = value;
        window.dispatchEvent(new Event('changeEnableEmitter'));
    };

    console.log(startListening, window.enableEmitter, 888)
    useEffect(() => {
        window.showVoice = true;
        if (!window.isEmitter & 1 == 2) {
            const emitter = VoiceActivityEmitter({ sampleRate: 16000 });
            window.isEmitter = true;
            emitter.startListening();
            emitter.on('segment', ({ audioBuffer }) => {
                window.audioBuffer = audioBuffer;
                handleSegment(audioBuffer)
            });
        }
        setEnableEmitter(true);

        setIsInit(true)
        setTimeout(() => {
            setIsInit(false);
        }, 3000);

        window.addEventListener('changeEnableEmitter', () => setStartListening(window.enableEmitter));
        window.addEventListener('readText', () => playAudio(window.readText));

        return () => {
            window.showVoice = false;
            setEnableEmitter(false);
            window.removeEventListener('changeEnableEmitter', () => setStartListening(window.enableEmitter));
            window.removeEventListener('readText', () => { });
        }
    }, []);



    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: 'black', position: 'fixed', top: 0, left: 0, zIndex: 20 }}>
            <div style={{ textAlign: 'center', position: 'absolute', top: '60px', left: '0', width: '100%', color: 'white', fontWeight: 'bold' }}>{appData.site.title}</div>
            <div style={{ width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'white', top: '200px', position: 'absolute', left: '50%', marginLeft: '-100px' }}>
                <img src="https://img95.699pic.com/xsj/1i/ih/r6.jpg%21/fh/300" style={{ borderRadius: '50%', width: '180px', height: '180px', marginTop: '10px', marginLeft: '10px' }} />
            </div>
            <div style={{ textAlign: 'center', position: 'absolute', width: '100%', bottom: '180px', color: 'white' }}>{isInit ? '正在初始化录音' : startListening ? '正在听...' : '正在回答...'}</div>

            <div onClick={() => onClose()} style={{ backgroundColor: '#EA4D3E', width: '80px', height: '80px', lineHeight: '80px', textAlign: 'center', borderRadius: '50%', color: 'white', fontSize: '30px', fontWeight: 'bold', position: 'absolute', left: '50%', marginLeft: '-40px', bottom: '50px' }}>×
            </div>
            <div style={{ width: '50px', height: '50px', backgroundColor: '#282828', borderRadius: '50%', position: 'absolute', bottom: '65px', left: '50%', marginLeft: '-120px', fontSize: '20px', lineHeight: '50px', color: '#CBCBCB', textAlign: 'center', }}>❚❚</div>
            <div style={{ textAlign: 'center', width: '100%', position: 'absolute', bottom: '20px', color: '#646464', fontSize: '14px' }}>内容由大模型生成，不能完全保障真实</div>
        </div>
    );
};

export default Voice;
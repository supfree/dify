import 'regenerator-runtime/runtime';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useChatWithHistoryContext } from '../chat-with-history/context'
import { useRecorder } from 'react-microphone-recorder';
import lamejs from 'lamejs'


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

const AudioFormat = 'MP3';
function audioBufferToWav(aBuffer) {
    let numOfChan = aBuffer.numberOfChannels,
        btwLength = aBuffer.length * numOfChan * 2 + 44,
        btwArrBuff = new ArrayBuffer(btwLength),
        btwView = new DataView(btwArrBuff),
        btwChnls = [],
        btwIndex,
        btwSample,
        btwOffset = 0,
        btwPos = 0;
    setUint32(0x46464952); // "RIFF"
    setUint32(btwLength - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(aBuffer.sampleRate);
    setUint32(aBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(btwLength - btwPos - 4); // chunk length

    for (btwIndex = 0; btwIndex < aBuffer.numberOfChannels; btwIndex++)
        btwChnls.push(aBuffer.getChannelData(btwIndex));

    while (btwPos < btwLength) {
        for (btwIndex = 0; btwIndex < numOfChan; btwIndex++) {
            // interleave btwChnls
            btwSample = Math.max(-1, Math.min(1, btwChnls[btwIndex][btwOffset])); // clamp
            btwSample =
                (0.5 + btwSample < 0 ? btwSample * 32768 : btwSample * 32767) | 0; // scale to 16-bit signed int
            btwView.setInt16(btwPos, btwSample, true); // write 16-bit sample
            btwPos += 2;
        }
        btwOffset++; // next source sample
    }

    let wavHdr = lamejs.WavHeader.readHeader(new DataView(btwArrBuff));

    //Stereo
    let data = new Int16Array(btwArrBuff, wavHdr.dataOffset, wavHdr.dataLen / 2);
    let leftData = [];
    let rightData = [];
    for (let i = 0; i < data.length; i += 2) {
        leftData.push(data[i]);
        rightData.push(data[i + 1]);
    }
    var left = new Int16Array(leftData);
    var right = new Int16Array(rightData);

    if (AudioFormat === "MP3") {
        //STEREO
        if (wavHdr.channels === 2)
            return wavToMp3Stereo(
                wavHdr.channels,
                wavHdr.sampleRate,
                left,
                right,
            );
        //MONO
        else if (wavHdr.channels === 1)
            return wavToMp3(wavHdr.channels, wavHdr.sampleRate, data);
    } else return new Blob([btwArrBuff], { type: "audio/wav" });

    function setUint16(data) {
        btwView.setUint16(btwPos, data, true);
        btwPos += 2;
    }

    function setUint32(data) {
        btwView.setUint32(btwPos, data, true);
        btwPos += 4;
    }
}

function wavToMp3(channels, sampleRate, left, right = null) {
    var buffer = [];
    var mp3enc = new lamejs.Mp3Encoder(channels, sampleRate, 128);
    var remaining = left.length;
    var samplesPerFrame = 1152;

    for (var i = 0; remaining >= samplesPerFrame; i += samplesPerFrame) {
        if (!right) {
            var mono = left.subarray(i, i + samplesPerFrame);
            var mp3buf = mp3enc.encodeBuffer(mono);
        } else {
            var leftChunk = left.subarray(i, i + samplesPerFrame);
            var rightChunk = right.subarray(i, i + samplesPerFrame);
            var mp3buf = mp3enc.encodeBuffer(leftChunk, rightChunk);
        }
        if (mp3buf.length > 0) {
            buffer.push(mp3buf); //new Int8Array(mp3buf));
        }
        remaining -= samplesPerFrame;
    }
    var d = mp3enc.flush();
    if (d.length > 0) {
        buffer.push(new Int8Array(d));
    }

    var mp3Blob = new Blob(buffer, { type: "audio/mp3" });
    //var bUrl = window.URL.createObjectURL(mp3Blob);

    // send the download link to the console
    //console.log('mp3 download:', bUrl);
    return mp3Blob;
}

const Voice: React.FC<VoiceType> = ({ onClose, onVoiceEnd }) => {
    const { appData } = useChatWithHistoryContext();
    const [isInit, setIsInit] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [submitting, setSubmitting] = useState(false);
    const [isAnswering, setIsAnswering] = useState(false);
    const [readText, setReadText] = useState('');
    const [blobUrl, setBlobUrl] = useState<string | undefined>('');


    const { audioBlob, startRecording, stopRecording, audioURL, recordingState, isRecording, audioFile } = useRecorder();
    function handleSegment() {
        if (!audioBlob || submitting) {
            return;
        }
        setSubmitting(true);
        setIsAnswering(true);
        const audioContext = new AudioContext();
        const fileReader = new FileReader();
        fileReader.onloadend = () => {
            const arrayBuffer = fileReader.result;
            audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
                var MP3Blob = audioBufferToWav(audioBuffer);
                const formData = new FormData()
                formData.append('file', MP3Blob, 'audio.mp3');
                const url = SPEECH_RECOGNITION_API_URL + `?AK=${AK}&SK=${SK}&t=${new Date()}`;
                try {
                    var xhr = new XMLHttpRequest();
                    xhr.open('post', url)
                    xhr.send(formData);
                    xhr.onload = function () {
                        if (xhr.status == 200) {
                            const result = JSON.parse(xhr.responseText);
                            const text = result.result[0] || '';
                            if (text.trim() === '') {
                                return;
                            }
                            onVoiceEnd(text);
                        } else {
                        }
                        //playAudio('我是你孙子');
                    }
                } catch (e) {
                    setIsAnswering(false);
                } finally {
                    setSubmitting(false);
                }
            });
        };
        fileReader.readAsArrayBuffer(audioBlob);


    }
    const start = () => {
        if (submitting) {
            return;
        }
        startRecording();
        setBlobUrl('');
    }
    const stop = () => {
        if (submitting) {
            return;
        }
        stopRecording();
        handleSegment();
    }

    useEffect(() => {
        if (audioURL != null) {
            setBlobUrl(audioURL);
            handleSegment();
        }
    }, [audioURL]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Control') {
                start();
            }
        };

        const handleKeyUp = (event) => {
            if (event.key === 'Control') {
                stop();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, []);


    //播放
    const playAudio = async (text) => {
        setIsAnswering(true);
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('post', SPEECH_SYNTHESIS_API_URL as string, true)
            xhr.setRequestHeader("Content-Type", "text/plain");
            xhr.setRequestHeader("Format", "webm-24khz-16bit-mono-opus");
            xhr.responseType = 'blob';
            xhr.send(`<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US"><voice name="zh-CN-YunjianNeural"><prosody rate="0%" pitch="0%">${removeCodeBlocks(text)}</prosody ></voice ></speak >`);
            xhr.onload = function () {
                if (xhr.status == 200) {
                    const blob = this.response;
                    const audioUrl = URL.createObjectURL(blob)
                    const audio = new Audio(audioUrl)
                    audioRef.current = audio
                    audio.play().then(() => { }).catch(() => {
                        URL.revokeObjectURL(audioUrl)
                    })
                    audio.onended = () => {
                        console.log('播放完了')
                    }
                } else {
                }
            }

        } catch (error) {
            console.error('Error playing audio:', error)
        } finally {
            window.playing = false;
            setReadText('');
            setSubmitting(false);
            setIsAnswering(false);
        }

    }

    useEffect(() => {
        window.showVoice = true;
        setIsInit(true)
        setTimeout(() => {
            setIsInit(false);
        }, 1000);

        window.addEventListener('readText', (e) => {
            setReadText(removeCodeBlocks(window.readText));
        });

        return () => {
            window.showVoice = false;
            window.removeEventListener('changeEnableEmitter', () => setStartListening(window.enableEmitter));
            window.removeEventListener('readText', () => { });
        }
    }, []);

    useEffect(() => {
        if (readText) {
            window.playing = true;
            playAudio(readText);
        }
    }, [readText]);


    const voiceColor=isRecording?'#89bceb':'#358fe4';
    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: 'black', position: 'fixed', top: 0, left: 0, zIndex: 20 }}>
            <div style={{ textAlign: 'center', position: 'absolute', top: '60px', left: '0', width: '100%', color: 'white', fontWeight: 'bold' }}>{appData.site.title}</div>
            <div style={{ width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'white', top: '160px', position: 'absolute', left: '50%', marginLeft: '-100px' }}>
                <img src="/voice.png" style={{ borderRadius: '50%', width: '180px', height: '180px', marginTop: '10px', marginLeft: '10px' }} />
            </div>
            <div style={{ textAlign: 'center', position: 'absolute', width: '100%', bottom: '180px', color: 'white' }}>
                {isInit ? '正在初始化录音' : isRecording ? '正在听...' :isAnswering? '正在回答...':'请提问'}
            </div>

            <div onMouseDown={start}
                onMouseUp={stop}
                onTouchStart={start}
                onTouchEnd={stop} style={{ backgroundColor: voiceColor, width: '80px', height: '80px', lineHeight: '80px', textAlign: 'center', borderRadius: '50%', color: 'white', fontSize: '30px', fontWeight: 'bold', position: 'absolute', left: '50%', marginLeft: '-40px', bottom: '50px', cursor:'pointer' }}>★
            </div>
            <div onClick={() => onClose()} style={{ width: '50px', height: '50px', backgroundColor: '#EA4D3E', borderRadius: '50%', position: 'absolute', bottom: '65px', left: '50%', marginLeft: '-120px', fontSize: '20px', lineHeight: '50px', color: '#ffffff', textAlign: 'center', cursor:'pointer' }}
            >×</div>
            <div onClick={() => playAudio('测试一下效果')} style={{ textAlign: 'center', width: '100%', position: 'absolute', bottom: '20px', color: '#646464', fontSize: '14px' }}>内容由大模型生成，不能完全保障真实</div>
            {blobUrl && (
                <audio controls src={blobUrl} style={{ display: 'none' }}>
                    Your browser does not support the audio element.
                </audio>
            )}

        </div>
    );
};

export default Voice;
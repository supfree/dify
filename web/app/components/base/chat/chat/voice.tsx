import 'regenerator-runtime/runtime';
import React, { useEffect, useState,useMemo } from 'react';
import { useChatWithHistoryContext } from '../chat-with-history/context'
import VoiceActivityEmitter from 'voice-activity-emitter';
import toWav from 'audiobuffer-to-wav';

type VoiceType = {
    onClose: () => void,
    onVoiceEnd:(text:string)=>void

}


const Voice: React.FC<VoiceType> = ({ onClose,onVoiceEnd}) => {
    const { appData } = useChatWithHistoryContext()
    let enableEmitter=window.enableEmitter;
    enableEmitter=true;
    
    function handleSegment(audioBuffer){
        if (!!enableEmitter) {
            enableEmitter=false;
            const blob = new Blob([toWav(audioBuffer)]);
            const formData = new FormData();
            formData.append('file', blob, 'audio.wav');

            const url = 'https://www.jisuan.mobi/ai/voice.php?t=' + new Date();

            var xhr = new XMLHttpRequest();
            xhr.open('post', url)
            xhr.send(formData);
            xhr.onload = function () {
                if (xhr.status == 200) {
                    enableEmitter=true;
                    const result=JSON.parse(xhr.responseText);
                    const text=result.text;
                    onVoiceEnd(text);
                    console.log(startListening,audioBuffer,text);
                } else {
                }
            }
        }
    }

    const startListening=useMemo((enableEmitter)=>enableEmitter,[window.enableEmitter]);
    console.log(startListening)
    useEffect(() => {
        if(!window.isEmitter){
            window!.isEmitter=true;
            const emitter = VoiceActivityEmitter({minSegmentLengthMS:500,smoothingTimeConstant:0.8});
            emitter.startListening();
            emitter.on('segment', ({ audioBuffer }) => {
                //emitter.stopListening();
                handleSegment(audioBuffer,)
            });
        }
        return ()=>enableEmitter=false;
    }, []);


    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: 'black', position: 'fixed', top: 0, left: 0, zIndex: 20 }}>
            <div style={{ textAlign: 'center', position: 'absolute', top: '60px', left: '0', width: '100%', color: 'white', fontWeight: 'bold' }}>{appData.site.title}</div>
            <div style={{ width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'white', top: '200px', position: 'absolute', left: '50%', marginLeft: '-100px' }}>
                <img src="https://img95.699pic.com/xsj/1i/ih/r6.jpg%21/fh/300" style={{ borderRadius: '50%', width: '180px', height: '180px', marginTop: '10px', marginLeft: '10px' }} />
            </div>
            <div style={{ textAlign: 'center', position: 'absolute', width: '100%', bottom: '180px', color: 'white' }}>{startListening ? '正在听...' : '正在回答...'}</div>

            <div onClick={() => onClose()} style={{ backgroundColor: '#EA4D3E', width: '80px', height: '80px', lineHeight: '80px', textAlign: 'center', borderRadius: '50%', color: 'white', fontSize: '30px', fontWeight: 'bold', position: 'absolute', left: '50%', marginLeft: '-40px', bottom: '50px' }}>×
                <div style={{ width: '50px', height: '50px', backgroundColor: '#282828', borderRadius: '50%', position: 'absolute', top: '15px', left: '-100px', fontSize: '20px', lineHeight: '50px', color: '#CBCBCB' }}>❚❚</div>
                <div style={{ width: '50px', height: '50px', backgroundColor: '#282828', borderRadius: '50%', position: 'absolute', top: '15px', right: '-100px', fontSize: '20px', lineHeight: '50px', color: '#CBCBCB' }}>▶️</div>
            </div>
            <div style={{ textAlign: 'center', width: '100%', position: 'absolute', bottom: '20px', color: '#646464', fontSize: '14px' }}>内容由大模型生成，不能完全保障真实</div>
        </div>
    );
};

export default Voice;
import 'regenerator-runtime/runtime';
import React, { useEffect, useState, useRef } from 'react';
import { useChatWithHistoryContext } from '../chat-with-history/context'
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";


type VoiceType = {
    onClose: () => void,
}

const DictationBox = () => {
    const {
        transcript,
        resetTranscript,
        listening,
        browserSupportsSpeechRecognition,
        startListening,
        stopListening,
    } = useSpeechRecognition();

    return (
        <div>
            <button onClick={startListening} disabled={listening || !browserSupportsSpeechRecognition}>
                开始说话
        </button>
            <button onClick={stopListening} disabled={!listening}>
                停止说话
        </button>
            <button onClick={resetTranscript} disabled={!transcript}>
                重置
        </button>
            {transcript && <p>{transcript}</p>}
        </div>
    );
};


const Voice: React.FC<VoiceType> = ({ onClose }) => {
    const { appData } = useChatWithHistoryContext()

    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: 'black', position: 'fixed', top: 0, left: 0, zIndex: 20 }}>
            <div style={{ textAlign: 'center', position: 'absolute', top: '60px', left: '0', width: '100%', color: 'white', fontWeight: 'bold' }}>{appData.site.title}</div>
            <div style={{ width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'white', top: '200px', position: 'absolute', left: '50%', marginLeft: '-100px' }}>
                <img src="https://img95.699pic.com/xsj/1i/ih/r6.jpg%21/fh/300" style={{ borderRadius: '50%', width: '180px', height: '180px', marginTop: '10px', marginLeft: '10px' }} />
            </div>
            <div style={{ textAlign: 'center', position: 'absolute', width: '100%', bottom: '180px', color: 'white' }}>正在听...</div>

            <div onClick={() => onClose()} style={{ backgroundColor: '#EA4D3E', width: '80px', height: '80px', lineHeight: '80px', textAlign: 'center', borderRadius: '50%', color: 'white', fontSize: '30px', fontWeight: 'bold', position: 'absolute', left: '50%', marginLeft: '-40px', bottom: '50px' }}>×
                <div style={{ width: '50px', height: '50px', backgroundColor: '#282828', borderRadius: '50%', position: 'absolute', top: '15px', left: '-100px', fontSize: '20px', lineHeight: '50px', color: '#CBCBCB' }}>❚❚</div>
                <div style={{ width: '50px', height: '50px', backgroundColor: '#282828', borderRadius: '50%', position: 'absolute', top: '15px', right: '-100px', fontSize: '20px', lineHeight: '50px', color: '#CBCBCB' }}>▶️</div>
            </div>
            <div style={{ textAlign: 'center', width: '100%', position: 'absolute', bottom: '20px', color: '#646464', fontSize: '14px' }}>内容由大模型生成，不能完全保障真实</div>
            <div>
                <SpeechRecognition
                    onResult={(result) => console.log(result.result[0][0].transcript)}
                    onError={(error) => console.error(error)}
                />
                <DictationBox />
            </div>
        </div>
    );
};

export default Voice;
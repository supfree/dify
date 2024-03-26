import 'regenerator-runtime/runtime';
import React, { useEffect, useState, useRef } from 'react';
import { useChatWithHistoryContext } from '../chat-with-history/context'
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useMediaDevices } from 'react-use';  

type VoiceType = {
    onClose: () => void,
}




const Voice: React.FC<VoiceType> = ({ onClose }) => {
    const { appData } = useChatWithHistoryContext()

    const [hasPermission, setHasPermission] = useState(false);  
    const [errorMessage, setErrorMessage] = useState('');  
    
    useEffect(() => {  
      const getPermission = async () => {  
        try {  
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });  
          // 你可以在这里使用stream来访问麦克风输入  
          console.log('Microphone stream obtained', stream);  
          setHasPermission(true);  
        } catch (error) {  
          console.error('Error obtaining microphone permission', error);  
          setErrorMessage(error.message);  
        }  
      };  
    
      getPermission();  
    
      // 清理函数，在组件卸载时执行  
      return () => {  
        // 停止并释放MediaStream（如果有的话）  
        // 这里只是一个示例，你需要根据实际情况来处理stream  
        // if (stream) {  
        //   stream.getTracks().forEach(track => track.stop());  
        // }  
      };  
    }, []);  

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

        </div>
    );
};

export default Voice;
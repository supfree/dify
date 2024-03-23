import type {
  FC,
  ReactNode,
} from 'react'
import {
  memo,
  useEffect,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { useThrottleEffect } from 'ahooks'
import { debounce } from 'lodash-es'
import type {
  ChatConfig,
  ChatItem,
  Feedback,
  OnSend,
} from '../types'
import Question from './question'
import Answer from './answer'
import ChatInput from './chat-input'
import TryToAsk from './try-to-ask'
import { ChatContextProvider } from './context'
import type { Emoji } from '@/app/components/tools/types'
import Button from '@/app/components/base/button'
import { StopCircle } from '@/app/components/base/icons/src/vender/solid/mediaAndDevices'

export type ChatProps = {
  chatList: ChatItem[]
  config?: ChatConfig
  isResponding?: boolean
  noStopResponding?: boolean
  onStopResponding?: () => void
  noChatInput?: boolean
  onSend?: OnSend
  chatContainerclassName?: string
  chatContainerInnerClassName?: string
  chatFooterClassName?: string
  chatFooterInnerClassName?: string
  suggestedQuestions?: string[]
  showPromptLog?: boolean
  questionIcon?: ReactNode
  answerIcon?: ReactNode
  allToolIcons?: Record<string, string | Emoji>
  onAnnotationEdited?: (question: string, answer: string, index: number) => void
  onAnnotationAdded?: (annotationId: string, authorName: string, question: string, answer: string, index: number) => void
  onAnnotationRemoved?: (index: number) => void
  chatNode?: ReactNode
  onFeedback?: (messageId: string, feedback: Feedback) => void
}

interface VoiceRecorderProps {}  
  
interface Chunk {  
  data: Blob;  
}  

const Chat: FC<ChatProps> = ({
  config,
  onSend,
  chatList,
  isResponding,
  noStopResponding,
  onStopResponding,
  noChatInput,
  chatContainerclassName,
  chatContainerInnerClassName,
  chatFooterClassName,
  chatFooterInnerClassName,
  suggestedQuestions,
  showPromptLog,
  questionIcon,
  answerIcon,
  allToolIcons,
  onAnnotationAdded,
  onAnnotationEdited,
  onAnnotationRemoved,
  chatNode,
  onFeedback,
}) => {
  const { t } = useTranslation()
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const chatContainerInnerRef = useRef<HTMLDivElement>(null)
  const chatFooterRef = useRef<HTMLDivElement>(null)
  const chatFooterInnerRef = useRef<HTMLDivElement>(null)

  const [showVoice, setShowVoice] = useState(false)


  //录音开始=============

  const [isRecording, setIsRecording] = useState(false);  
  const audioContext = useRef<AudioContext>(new (window.AudioContext || window.webkitAudioContext)());  
  const source = useRef<MediaStreamAudioSourceNode | null>(null);  
  const analyser = useRef<AnalyserNode | null>(null);  
  const dataArray = useRef<Uint8Array>(new Uint8Array(0));  
  const recorder = useRef<MediaRecorder | null>(null);  
  const chunks = useRef<Chunk[]>([]);  

  
  useEffect(() => {  
    const requestMicrophoneAccess = async () => {  
      try {  
        const stream = navigator.mediaDevices.getUserMedia({ audio: true });  
  
        stream  
          .then((stream) => {  
            source.current = audioContext.current.createMediaStreamSource(stream);  
            analyser.current = audioContext.current.createAnalyser();  
            analyser.current.fftSize = 2048;  
            const bufferLength = analyser.current.frequencyBinCount;  
            dataArray.current = new Uint8Array(bufferLength);  
            source.current.connect(analyser.current);  
      
            const intervalId = setInterval(checkMicrophone, 100);  
      
            return () => {  
              clearInterval(intervalId);  
              if (recorder.current) {  
                recorder.current.stop();  
              }  
              source.current?.disconnect();  
            };  
          })  
          .catch((error) => {  
            console.error('Error accessing the microphone:', error);  
          });  
      } catch (error) {  
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {  
          // 用户拒绝权限  

        } else {  
          // 其他错误  
        }  
      }  
    };  
  
    // 请求麦克风权限  
    requestMicrophoneAccess();  
  }, []);

  useEffect(() => {  

  }, []); // 空依赖数组确保此effect只运行一次（组件挂载时）  
  
  const checkMicrophone = () => {  
    if (analyser.current) {  
      analyser.current.getByteTimeDomainData(dataArray.current);  
      const average = dataArray.current.reduce((a, b) => a + b, 0) / dataArray.current.length;  
      const threshold = 0.05; // 调整这个阈值以适应你的需求  
  
      if (average > threshold && !isRecording) {  
        //startRecording();  
      } else if (average <= threshold && isRecording) {  
        //stopRecording();  
      }  
    }  
  }; 
  


  //录音结束

  const handleScrolltoBottom = () => {
    if (chatContainerRef.current)
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
  }

  const handleWindowResize = () => {
    if (chatContainerRef.current && chatFooterRef.current)
      chatFooterRef.current.style.width = `${chatContainerRef.current.clientWidth}px`

    if (chatContainerInnerRef.current && chatFooterInnerRef.current)
      chatFooterInnerRef.current.style.width = `${chatContainerInnerRef.current.clientWidth}px`
  }

  useThrottleEffect(() => {
    handleScrolltoBottom()
    handleWindowResize()
  }, [chatList], { wait: 500 })

  useEffect(() => {
    window.addEventListener('resize', debounce(handleWindowResize))
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [])

  useEffect(() => {
    if (chatFooterRef.current && chatContainerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { blockSize } = entry.borderBoxSize[0]

          chatContainerRef.current!.style.paddingBottom = `${blockSize}px`
          handleScrolltoBottom()
        }
      })

      resizeObserver.observe(chatFooterRef.current)

      return () => {
        resizeObserver.disconnect()
      }
    }
  }, [chatFooterRef, chatContainerRef])

  const hasTryToAsk = config?.suggested_questions_after_answer?.enabled && !!suggestedQuestions?.length && onSend

  return (
    <ChatContextProvider
      config={config}
      chatList={chatList}
      isResponding={isResponding}
      showPromptLog={showPromptLog}
      questionIcon={questionIcon}
      answerIcon={answerIcon}
      allToolIcons={allToolIcons}
      onSend={onSend}
      onAnnotationAdded={onAnnotationAdded}
      onAnnotationEdited={onAnnotationEdited}
      onAnnotationRemoved={onAnnotationRemoved}
      onFeedback={onFeedback}
    >
      <div className='relative h-full'>
        <div
          ref={chatContainerRef}
          className={`relative h-full overflow-y-auto ${chatContainerclassName}`}
        >
          {chatNode} <span onClick={()=>setShowVoice(true)}>测试全屏</span>
          <div
            ref={chatContainerInnerRef}
            className={`${chatContainerInnerClassName}`}
          >
            {
              chatList.map((item, index) => {
                if (item.isAnswer) {
                  const isLast = item.id === chatList[chatList.length - 1]?.id
                  return (
                    <Answer
                      key={item.id}
                      item={item}
                      question={chatList[index - 1]?.content}
                      index={index}
                      config={config}
                      answerIcon={answerIcon}
                      responding={isLast && isResponding}
                      allToolIcons={allToolIcons}
                    />
                  )
                }
                return (
                  <Question
                    key={item.id}
                    item={item}
                    showPromptLog={showPromptLog}
                    questionIcon={questionIcon}
                    isResponding={isResponding}
                  />
                )
              })
            }
          </div>
        </div>
        <div
          className={`absolute bottom-0 ${(hasTryToAsk || !noChatInput || !noStopResponding) && chatFooterClassName}`}
          ref={chatFooterRef}
          style={{
            background: 'linear-gradient(0deg, #F9FAFB 40%, rgba(255, 255, 255, 0.00) 100%)',
          }}
        >
          <div
            ref={chatFooterInnerRef}
            className={`${chatFooterInnerClassName}`}
          >
            {
              !noStopResponding && isResponding && (
                <div className='flex justify-center mb-2'>
                  <Button className='py-0 px-3 h-7 bg-white shadow-xs' onClick={onStopResponding}>
                    <StopCircle className='mr-[5px] w-3.5 h-3.5 text-gray-500' />
                    <span className='text-xs text-gray-500 font-normal'>{t('appDebug.operation.stopResponding')}</span>
                  </Button>
                </div>
              )
            }
            {
              hasTryToAsk && (
                <TryToAsk
                  suggestedQuestions={suggestedQuestions}
                  onSend={onSend}
                />
              )
            }
            {
              !noChatInput && (
                <ChatInput
                  visionConfig={config?.file_upload?.image}
                  speechToTextConfig={config?.speech_to_text}
                  onSend={onSend}
                />
              )
            }
          </div>
        </div>
      </div>
      {showVoice&&<div style={{width:'100%',height:'100%',backgroundColor:'black',position:'fixed',top:0,left:0,zIndex:20}}>
            <div onClick={()=>setShowVoice(false)} style={{backgroundColor:'#EA4D3E',width:'80px',height:'80px',lineHeight:'80px',textAlign:'center',borderRadius:'50%',color:'white',fontSize:'30px',fontWeight:'bold',position:'absolute',left:'50%',marginLeft:'-40px',bottom:'100px'}}>×</div>
      </div>}
    </ChatContextProvider>
  )
}

export default memo(Chat)

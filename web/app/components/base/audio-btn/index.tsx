'use client'
import { useRef, useState } from 'react'
import { t } from 'i18next'
import { useParams, usePathname } from 'next/navigation'
import s from './style.module.css'
import Tooltip from '@/app/components/base/tooltip'
import { randomString } from '@/utils'
import { textToAudio } from '@/service/share'
const SPEECH_SYNTHESIS_API_URL = process.env.NEXT_PUBLIC_SPEECH_SYNTHESIS_API_URL;
type AudioBtnProps = {
  value: string
  voice?: string
  className?: string
  isAudition?: boolean
}

const AudioBtn = ({
  value,
  voice,
  className,
  isAudition,
}: AudioBtnProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPause, setPause] = useState(false)
  const [hasEnded, setHasEnded] = useState(false)
  const selector = useRef(`play-tooltip-${randomString(4)}`)
  const params = useParams()
  const pathname = usePathname()
  const removeCodeBlocks = (inputText: any) => {
    const codeBlockRegex = /```[\s\S]*?```/g
    if (inputText)
      return inputText.replace(codeBlockRegex, '')
    return ''
  }

  const playAudio = async () => {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('post', SPEECH_SYNTHESIS_API_URL as string, true)
      xhr.setRequestHeader("Content-Type", "text/plain");
      xhr.setRequestHeader("Format", "webm-24khz-16bit-mono-opus");
      xhr.responseType = 'blob';
      xhr.send(`<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US"><voice name="zh-CN-YunjianNeural"><prosody rate="0%" pitch="0%">${removeCodeBlocks(value)}</prosody ></voice ></speak >`);
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

    }
  }
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        if (!hasEnded) {
          setPause(false)
          audioRef.current.play()
        }
        if (!isPause) {
          setPause(true)
          audioRef.current.pause()
        }
      }
      else if (!isPlaying) {
        if (isPause) {
          setPause(false)
          audioRef.current.play()
        }
        else {
          setHasEnded(false)
          playAudio().then()
        }
      }
      setIsPlaying(prevIsPlaying => !prevIsPlaying)
    }
    else {
      setIsPlaying(true)
      if (!isPlaying)
        playAudio().then()
    }
  }

  return (
    <div className={`${(isPlaying && !hasEnded) ? 'mr-1' : className}`}>
      <Tooltip
        selector={selector.current}
        content={(!isPause ? ((isPlaying && !hasEnded) ? t('appApi.playing') : t('appApi.play')) : t('appApi.pause')) as string}
        className='z-10'
      >
        <div
          className={`box-border p-0.5 flex items-center justify-center cursor-pointer ${isAudition || 'rounded-md bg-white'}`}
          style={{ boxShadow: !isAudition ? '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)' : '' }}
          onClick={togglePlayPause}>
          <div className={`w-6 h-6 rounded-md ${!isAudition ? 'hover:bg-gray-200' : 'hover:bg-gray-50'} ${(isPlaying && !hasEnded) ? s.pauseIcon : s.playIcon}`}></div>
        </div>
      </Tooltip>
    </div>
  )
}

export default AudioBtn

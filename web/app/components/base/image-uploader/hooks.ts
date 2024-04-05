import { useCallback, useMemo, useRef, useState } from 'react'
import type { ClipboardEvent } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { imageUpload } from './utils'
import { useToastContext } from '@/app/components/base/toast'
import { ALLOW_FILE_EXTENSIONS,ALLOW_IMAGE_FILE_EXTENSIONS, TransferMethod } from '@/types/app'
import type { ImageFile, VisionSettings } from '@/types/app'

export const useImageFiles = () => {
  const params = useParams()
  const { t } = useTranslation()
  const { notify } = useToastContext()
  const [files, setFiles] = useState<ImageFile[]>([])
  const filesRef = useRef<ImageFile[]>([])

  const handleUpload = (imageFile: ImageFile) => {
    const files = filesRef.current
    const index = files.findIndex(file => file._id === imageFile._id)

    if (index > -1) {
      const currentFile = files[index]
      const newFiles = [...files.slice(0, index), { ...currentFile, ...imageFile }, ...files.slice(index + 1)]
      setFiles(newFiles)
      filesRef.current = newFiles
    }
    else {
      const newFiles = [...files, imageFile]
      setFiles(newFiles)
      filesRef.current = newFiles
    }
  }
  const handleRemove = (imageFileId: string) => {
    const files = filesRef.current
    const index = files.findIndex(file => file._id === imageFileId)

    if (index > -1) {
      const currentFile = files[index]
      const newFiles = [...files.slice(0, index), { ...currentFile, deleted: true }, ...files.slice(index + 1)]
      setFiles(newFiles)
      filesRef.current = newFiles
    }
  }
  const handleImageLinkLoadError = (imageFileId: string) => {
    const files = filesRef.current
    const index = files.findIndex(file => file._id === imageFileId)

    if (index > -1) {
      const currentFile = files[index]
      const newFiles = [...files.slice(0, index), { ...currentFile, progress: -1 }, ...files.slice(index + 1)]
      filesRef.current = newFiles
      setFiles(newFiles)
    }
  }
  const handleImageLinkLoadSuccess = (imageFileId: string) => {
    const files = filesRef.current
    const index = files.findIndex(file => file._id === imageFileId)

    if (index > -1) {
      const currentImageFile = files[index]
      const newFiles = [...files.slice(0, index), { ...currentImageFile, progress: 100 }, ...files.slice(index + 1)]
      filesRef.current = newFiles
      setFiles(newFiles)
    }
  }
  const handleReUpload = (imageFileId: string) => {
    const files = filesRef.current
    const index = files.findIndex(file => file._id === imageFileId)

    if (index > -1) {
      const currentImageFile = files[index]
      imageUpload({
        file: currentImageFile.file!,
        onProgressCallback: (progress) => {
          const newFiles = [...files.slice(0, index), { ...currentImageFile, progress }, ...files.slice(index + 1)]
          filesRef.current = newFiles
          setFiles(newFiles)
        },
        onSuccessCallback: (res) => {
          const newFiles = [...files.slice(0, index), { ...currentImageFile, fileId: res.id, progress: 100 }, ...files.slice(index + 1)]
          filesRef.current = newFiles
          setFiles(newFiles)
        },
        onErrorCallback: () => {
          notify({ type: 'error', message: t('common.imageUploader.uploadFromComputerUploadError') })
          const newFiles = [...files.slice(0, index), { ...currentImageFile, progress: -1 }, ...files.slice(index + 1)]
          filesRef.current = newFiles
          setFiles(newFiles)
        },
      }, !!params.token)
    }
  }

  const handleClear = () => {
    setFiles([])
    filesRef.current = []
  }

  const filteredFiles = useMemo(() => {
    return files.filter(file => !file.deleted)
  }, [files])

  return {
    files: filteredFiles,
    onUpload: handleUpload,
    onRemove: handleRemove,
    onImageLinkLoadError: handleImageLinkLoadError,
    onImageLinkLoadSuccess: handleImageLinkLoadSuccess,
    onReUpload: handleReUpload,
    onClear: handleClear,
  }
}

type useLocalUploaderProps = {
  disabled?: boolean
  limit?: number
  onUpload: (imageFile: ImageFile) => void
  onUploaded?:(text:string)=>void
}

export const useLocalFileUploader = ({ limit, disabled = false, onUpload,onUploaded }: useLocalUploaderProps) => {
  const { notify } = useToastContext()
  const params = useParams()
  const { t } = useTranslation()

  const handleLocalFileUpload = useCallback((file: File) => {
    if (disabled) {
      // TODO: leave some warnings?
      return
    }
    const ext=file.name.split('.')[file.name.split('.').length-1];

    if (!ALLOW_FILE_EXTENSIONS.includes(ext)) //改过
      return
      
    if(!ALLOW_IMAGE_FILE_EXTENSIONS.includes(ext)){
      
      const url = 'https://www.jisuan.mobi/ai/';
      const formData = new FormData();
      formData.append('file', file);
      
      // 创建 HTTP 请求
      var xhr = new XMLHttpRequest();
      // 对ajax对象进行配置
      // 只有post方法能实现文件上传
      xhr.open('post',url+'upload.php')
      // 把文件发送到服务端 发送ajax请求
      xhr.send(formData);
      // 监听服务器端响应给客户端的数据
      xhr.onload = function(){
        // 如果服务器端返回的http状态码为200 请求成功
        if(xhr.status == 200){
          // 将服务器端返回的数据显示在控制台中
          const fileName=file.name;
          const fileUrl=url+'uploads/'+xhr.responseText
          onUploaded&&onUploaded(`[${fileName}](${fileUrl})`)
        }else{
          console.log("上传失败，出错了")
        }
      }
    }else{
      if (limit && file.size > limit * 1024 * 1024) {
        notify({ type: 'error', message: t('common.imageUploader.uploadFromComputerLimit', { size: limit }) })
        return
      }

      const reader = new FileReader()
      reader.addEventListener(
        'load',
        () => {
          const imageFile = {
            type: TransferMethod.local_file,
            _id: `${Date.now()}`,
            fileId: '',
            file,
            url: reader.result as string,
            base64Url: reader.result as string,
            progress: 0,
          }
          onUpload(imageFile)
          imageUpload({
            file: imageFile.file,
            onProgressCallback: (progress) => {
              onUpload({ ...imageFile, progress })
            },
            onSuccessCallback: (res) => {
              onUpload({ ...imageFile, fileId: res.id, progress: 100 })
            },
            onErrorCallback: () => {
              notify({ type: 'error', message: t('common.imageUploader.uploadFromComputerUploadError') })
              onUpload({ ...imageFile, progress: -1 })
            },
          }, !!params.token)
        },
        false,
      )
      reader.addEventListener(
        'error',
        () => {
          notify({ type: 'error', message: t('common.imageUploader.uploadFromComputerReadError') })
        },
        false,
      )
      reader.readAsDataURL(file)
    }
  }, [disabled, limit, notify, t, onUpload, params.token])

  return { disabled, handleLocalFileUpload }
}

type useClipboardUploaderProps = {
  files: ImageFile[]
  visionConfig?: VisionSettings
  onUpload: (imageFile: ImageFile) => void
}

export const useClipboardUploader = ({ visionConfig, onUpload, files }: useClipboardUploaderProps) => {
  const allowLocalUpload = visionConfig?.transfer_methods?.includes(TransferMethod.local_file)
  const disabled = useMemo(() =>
    !visionConfig
    || !visionConfig?.enabled
    || !allowLocalUpload
    || files.length >= visionConfig.number_limits!,
  [allowLocalUpload, files.length, visionConfig])
  const limit = useMemo(() => visionConfig ? +visionConfig.image_file_size_limit! : 0, [visionConfig])
  const { handleLocalFileUpload } = useLocalFileUploader({ limit, onUpload, disabled })

  const handleClipboardPaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    // reserve native text copy behavior
    const file = e.clipboardData?.files[0]
    // when copyed file, prevent default action
    if (file) {
      e.preventDefault()
      handleLocalFileUpload(file)
    }
  }, [handleLocalFileUpload])

  return {
    onPaste: handleClipboardPaste,
  }
}

type useDraggableUploaderProps = {
  files: ImageFile[]
  visionConfig?: VisionSettings
  onUpload: (imageFile: ImageFile) => void
}

export const useDraggableUploader = <T extends HTMLElement>({ visionConfig, onUpload, files }: useDraggableUploaderProps) => {
  const allowLocalUpload = visionConfig?.transfer_methods?.includes(TransferMethod.local_file)
  const disabled = useMemo(() =>
    !visionConfig
    || !visionConfig?.enabled
    || !allowLocalUpload
    || files.length >= visionConfig.number_limits!,
  [allowLocalUpload, files.length, visionConfig])
  const limit = useMemo(() => visionConfig ? +visionConfig.image_file_size_limit! : 0, [visionConfig])
  const { handleLocalFileUpload } = useLocalFileUploader({ disabled, onUpload, limit })
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent<T>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled)
      setIsDragActive(true)
  }, [disabled])

  const handleDragOver = useCallback((e: React.DragEvent<T>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<T>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<T>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const file = e.dataTransfer.files[0]

    if (!file)
      return

    handleLocalFileUpload(file)
  }, [handleLocalFileUpload])

  return {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    isDragActive,
  }
}

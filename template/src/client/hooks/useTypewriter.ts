import { useState, useEffect, useRef } from 'react'

interface UseTypewriterOptions {
  text: string
  isStreaming: boolean
  speed?: number
}

export function useTypewriter({ text, isStreaming, speed = 30 }: UseTypewriterOptions): string {
  const [displayedText, setDisplayedText] = useState('')
  const targetTextRef = useRef('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const charIndexRef = useRef(0)

  const calculateSpeed = (totalLength: number): number => {
    if (totalLength < 50) return 20
    if (totalLength < 200) return 30
    if (totalLength < 500) return 40
    return 50
  }

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text)
      targetTextRef.current = text
      charIndexRef.current = text.length
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    const newText = text.slice(targetTextRef.current.length)
    if (newText.length > 0) {
      targetTextRef.current = text
    }

    const typeNextCharacter = () => {
      if (charIndexRef.current < targetTextRef.current.length) {
        const char = targetTextRef.current.charAt(charIndexRef.current)
        charIndexRef.current++

        setDisplayedText(prev => prev + char)

        const dynamicSpeed = calculateSpeed(targetTextRef.current.length)
        timeoutRef.current = setTimeout(typeNextCharacter, dynamicSpeed)
      } else {
        timeoutRef.current = null
      }
    }

    if (!timeoutRef.current && charIndexRef.current < targetTextRef.current.length) {
      const initialSpeed = calculateSpeed(text.length)
      timeoutRef.current = setTimeout(typeNextCharacter, initialSpeed)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [text, isStreaming, speed])

  return displayedText
}

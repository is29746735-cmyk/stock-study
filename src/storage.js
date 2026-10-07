import { useEffect, useState } from 'react'

// 휴대폰 브라우저 안(localStorage)에 저장한다. 다른 기기와는 공유되지 않는다.
export function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // 저장 공간이 꽉 찼거나 막힌 경우. 화면은 계속 동작한다.
    }
  }, [key, value])

  return [value, setValue]
}

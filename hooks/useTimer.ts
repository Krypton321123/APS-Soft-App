import { useState, useEffect, useRef } from 'react'; 

export default function useTimer({ initialTime, onComplete, isActive }: {initialTime: number, onComplete: () => void, isActive: boolean}) {

    let intervalRef: any = useRef(null); 
    const [time, setTime] = useState(initialTime); 

    useEffect(() => {
        if (isActive) {
               intervalRef.current = setInterval(() => {
                setTime(prev => {
                    if (prev < 1) {
                        if (intervalRef.current) clearInterval(intervalRef.current); 
                        onComplete(); 
                        return 0; 
                    } 
                    return prev - 1; 
                })
            }, 1000); 

            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current); 
            }
        } else {
            setTime(initialTime)
        }



    }, [initialTime, onComplete, isActive])

     const reset = () => {
        setTime(initialTime);
    };

  const formattedTime = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;

  return {time, formattedTime, reset, setTime}
}
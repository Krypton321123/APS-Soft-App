import { useEffect, useState } from "react"
import { Modal, Text, ToastAndroid, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import ky from 'ky'
import { API_URL } from "@/constants"

export default function Attendance() {

    const [showAttendanceModal, setShowAttendanceModal] = useState(false)
    const router = useRouter(); 

    useEffect(() => {
        const getAttendanceData = async () => {
            const userId = await AsyncStorage.getItem('userId'); 

            const todayDate = new Date().toLocaleString('en-CA', {
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric'
            })


            const response: any = await ky.post(`${API_URL}/attendance/checkAttendance`, {json: {userId, date: todayDate}}).json();
            console.log(response)
            if (response.statusCode === 201) {
                return router.replace('/PreHome')
            } else if (response.statusCode === 200) {
                return ToastAndroid.show('YOU ALREADY MARKED ABSENT FOR TODAY!', ToastAndroid.SHORT)
            } else if(response.statusCode === 202) {
                return; 
            }
        }

        getAttendanceData()
    }, [])

    const handlePresent = () => {

        console.log("hello")
        router.replace({ pathname: 
            '/Camera', 
            params: {
                caller: 'attendance', partyId: ""
            }
        })
        setShowAttendanceModal(false)
    }

    const getCurrentDateTime = () => {
        const now = new Date()
        const date = now.toLocaleDateString()
        const time = now.toLocaleTimeString()
        return { date, time }
    }

    const handleAbsent = async () => {
      const userId = await AsyncStorage.getItem('userId')
      const { date, time } = getCurrentDateTime()
      console.log(`${userId} is present - Date: ${date}, Time: ${time}`)
      
      const response: any = await ky.post(`${API_URL}/user/markAttendance`, {
        json: {
          userId, status, time: Date.now(), absentReason: "", markedBy: userId
        }
      }).json()

      if (response.statusCode === 200) {
        const date = new Date().toLocaleDateString('en-IN', {
            day: '2-digit', 
            month: '2-digit', 
            year: '2-digit'
        })
        ToastAndroid.show("Attendance marked absent successfully, logging you out", ToastAndroid.SHORT)
        await AsyncStorage.setItem("attendanceData", JSON.stringify({
            date, marked: "absent"
        }))
        await AsyncStorage.removeItem('userId')
        router.replace('/Login')
      }
    }

    return (
        <SafeAreaView className="flex-1">
            <View className="w-full h-24 flex justify-center items-center bg-blue-600">
                <Text className="text-white text-2xl font-semibold tracking-wider">Mark Attendance for Today</Text>
            </View>
            <View className="flex-1 justify-center items-center">
                <TouchableOpacity onPress={() => setShowAttendanceModal(true)} className="w-40 h-14 flex justify-center items-center rounded-full bg-blue-600">
                    <Text className="text-white font-medium">Mark Attendance</Text>
                </TouchableOpacity>
            </View> 

            <Modal 
            animationType="fade"
            visible={showAttendanceModal}
            transparent={true}
            onRequestClose={() => setShowAttendanceModal(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/40">
                    <View className="flex justify-start pt-4 h-64 w-3/4 rounded-lg bg-white">
                        <View className="flex items-center w-full mb-[-40px] h-16 whitespace-nowrap">
                            <Text className="w-full text-center text-2xl font-bold">Mark Attendance</Text>
                        </View>
                        <View className="flex-1 justify-center items-center gap-4">
                            <TouchableOpacity onPress={() => {handlePresent()}} className="py-4 w-1/2 bg-green-600 flex justify-center rounded-full items-center">
                             <Text className="text-white text-lg font-GeistBold">Present</Text>   
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {handleAbsent()}} className="py-4 w-1/2 bg-red-600 flex justify-center rounded-full items-center">
                                <Text className="text-white text-lg font-GeistBold">Absent</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
        
    )
}
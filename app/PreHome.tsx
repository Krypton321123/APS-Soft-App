import { View, Text, TouchableOpacity, Modal, TextInput, Alert, Animated, Easing, ActivityIndicator } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ky from 'ky'
import { API_URL } from '../constants'
import { isTracking, startTracking, stopTracking } from '@/utils/locations'

const PreHome = () => {
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false)
  const [absentReasonModalVisible, setAbsentReasonModalVisible] = useState(false)
  const [absentReason, setAbsentReason] = useState('')
  const [attendanceStatus, setAttendanceStatus] = useState<'idle' | 'processing' | 'success'>('idle')
  const [selectedOption, setSelectedOption] = useState<'present' | 'absent' | null>(null)
  const [isTracking1, setIsTracking1] = useState(false)
  

  useEffect(() => {
    const trackingStatus = async () => {
      const temp = await isTracking()

      if (temp) {
        setIsTracking1(true)
      } 
    }

    trackingStatus()
  }, [])

  // Animation values
  const modalScale = useRef(new Animated.Value(0)).current
  const modalOpacity = useRef(new Animated.Value(0)).current

  const getCurrentDateTime = () => {
    const now = new Date()
    const date = now.toLocaleDateString()
    const time = now.toLocaleTimeString()
    return { date, time }
  }


  const handleAttendance = async (status: "present" | "absent" | null, absentReason: string) => {
    setSelectedOption(status)
    setAttendanceStatus('processing')
    
    try {
      const userId = await AsyncStorage.getItem('userId')
      const { date, time } = getCurrentDateTime()
      console.log(`${userId} is present - Date: ${date}, Time: ${time}`)
      
      const response: any = await ky.post(`${API_URL}/user/markAttendance`, {
        json: {
          userId, status, time: Date.now(), absentReason: status === 'present' ? "" : absentReason, markedBy: userId
        }
      }).json()

      console.log(response)

      if (response.success === true) {
        Alert.alert('', "Attendance marked sucessfully")
        setAttendanceModalVisible(false)
        setAttendanceStatus("idle")
      } else {
        Alert.alert('', 'Attendance already marked')
        setAttendanceModalVisible(false)
      }
    } catch (error) {
      
      setAttendanceStatus('idle')
      setAttendanceModalVisible(false)
      Alert.alert('Sorry', 'Attendance marked for today already!')
    }
  }


  const submitAbsentReason = async () => {
    if (!absentReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for absence')
      return
    }

    try {
      const userId = await AsyncStorage.getItem('userId')
      const { date, time } = getCurrentDateTime()
      console.log(`${userId} is absent because ${absentReason} - Date: ${date}, Time: ${time}`)
      setAbsentReasonModalVisible(false)
      setAbsentReason('')
      Alert.alert('Success', 'Attendance marked as Absent')
    } catch (error) {
      console.error('Error getting userId:', error)
      Alert.alert('Error', 'Could not mark attendance')
    }
  }

  const handleBeats = async () => {
    await startTracking()
    router.push('/Home');
  }

  const handleChangePassword = () => {
    // Navigate to change password screen
    console.log('user tried to chagne password')
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await stopTracking()
              await AsyncStorage.multiRemove(['userId', 'username', 'userType']);
              router.replace('/Login')
            } catch (error) {
              console.error('Error during logout:', error)
              Alert.alert('Error', 'Could not logout properly')
            }
          }
        }
      ]
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="pt-16 pb-6 px-6 bg-white">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">Dashboard 12345</Text>
          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
            <Text className="text-lg">👤</Text>
          </View>
        </View>
        <Text className="text-gray-600">LOCATION STATUS: {isTracking1 ? "Currently Tracking" : "Not Tracking"}</Text>
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6 pt-6">
        {/* Quick Actions Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-gray-900">Quick Actions</Text>
          <View className="w-6 h-0.5 bg-gray-300 rounded-full" />
        </View>

        {/* Action Cards */}
        <View className="space-y-3 mb-8">
          {/* Mark Attendance */}

          {/* BEATS */}
          <TouchableOpacity 
            className="bg-white mb-4 rounded-2xl p-5 shadow-sm border border-gray-100 active:bg-gray-50"
            onPress={handleBeats}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 bg-purple-100 rounded-2xl items-center justify-center mr-4">
                  <Text className="text-lg">🎵</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 mb-1">BEATS</Text>
                  <Text className="text-sm text-gray-500">Access your workspace</Text>
                </View>
              </View>
              <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center">
                <Text className="text-gray-600 font-medium">→</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Change Password */}
          <TouchableOpacity 
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:bg-gray-50"
            onPress={handleChangePassword}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 bg-blue-100 rounded-2xl items-center justify-center mr-4">
                  <Text className="text-lg">🔒</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 mb-1">Change Password</Text>
                  <Text className="text-sm text-gray-500">Update security settings</Text>
                </View>
              </View>
              <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center">
                <Text className="text-gray-600 font-medium">→</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-gray-900">Account</Text>
          <View className="w-6 h-0.5 bg-gray-300 rounded-full" />
        </View>

        <TouchableOpacity 
          className="bg-white rounded-2xl p-5 shadow-sm border border-red-200 active:bg-red-50"
          onPress={handleLogout}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-red-100 rounded-2xl items-center justify-center mr-4">
                <Text className="text-lg">🚪</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-red-600 mb-1">Sign Out</Text>
                <Text className="text-sm text-red-400">Logout from this device</Text>
              </View>
            </View>
            <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center">
              <Text className="text-red-600 font-medium">→</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Attendance Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={attendanceModalVisible}
        onRequestClose={() => setAttendanceModalVisible(false)}
        onShow={() => {
          // Modal entrance animation
          Animated.parallel([
            Animated.timing(modalScale, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.back(1.2)),
              useNativeDriver: true,
            }),
            Animated.timing(modalOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start()
        }}
      >
        <View className="flex-1 bg-black/40 justify-center items-center px-6">
          <Animated.View
            style={{
              transform: [{ scale: modalScale }],
              opacity: modalOpacity
            }}
            className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl"
          >
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-green-100 rounded-3xl items-center justify-center mb-4">
                <Text className="text-2xl">📋</Text>
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">Mark Attendance</Text>
              <Text className="text-gray-500 text-center">Ready to mark your attendance?</Text>
              <Text className="text-gray-400 text-sm mt-1">{getCurrentDateTime().date}</Text>
            </View>
            
            {attendanceStatus === 'success' ? (
              <View className="items-center py-4">
                <ActivityIndicator size="large" color="#10B981" />
                <Text className="text-green-600 font-semibold mt-2">Marked successfully!</Text>
              </View>
            ) : (
              <View className="space-y-3">
                {/* Present Button */}
                
                <TouchableOpacity
                  className="w-full h-20 rounded-2xl flex-row items-center justify-center p-5 mb-6 bg-emerald-500 active:bg-emerald-600 border-2 border-emerald-400"
                  onPress={() => handleAttendance('present', '')}
                  disabled={attendanceStatus !== 'idle'}
                  accessibilityLabel="Mark present"
                  accessibilityRole="button"
                  style={{
                    transform: [{ scale: attendanceStatus === 'processing' && selectedOption === 'present' ? 0.98 : 1 }],
                    shadowColor: '#10b981',
                    shadowOffset: { width: 0, height: 6 },
                    shadowRadius: 15,
                    shadowOpacity: 0.4,
                    elevation: 8,
                  }}
                >
                  {attendanceStatus === 'processing' && selectedOption === 'present' ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator color="white" size="large" />
                      <Text className="text-white text-lg font-semibold ml-3">Processing...</Text>
                    </View>
                  ) : (
                    <>
                      {/* <View className="w-14 h-14 bg-emerald-600 rounded-2xl items-center justify-center mr-4 border-2 border-emerald-300">
                        {/* <View className="w-10 h-10 bg-white rounded-xl items-center justify-center">
                          <Text className="text-emerald-600 text-xl font-black">✓</Text>
                        </View> */}
                      {/* </View>  */}
                      <View className="flex-1">
                        <Text className="text-white text-xl font-bold tracking-wider">Mark Present</Text>
                        <Text className="text-emerald-100 text-sm font-medium mt-0.5">Confirm attendance</Text>
                      </View>
                      <View className="w-8 h-8 bg-emerald-600 rounded-full items-center justify-center border-2 border-emerald-300">
                        <Text className="text-white text-sm font-bold">→</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>

                {/* Absent Button */}
                <TouchableOpacity
                  className="w-full h-18 bg-amber-600 rounded-2xl flex-row items-center justify-center p-5 bg-gradient-to-r from-amber-500 to-orange-600 active:from-amber-600 active:to-orange-700 shadow-xl shadow-amber-500/25 border border-amber-400/30"
                  onPress={() => {handleAttendance('absent', absentReason)}}
                  disabled={attendanceStatus !== 'idle'}
                  accessibilityLabel="Mark absent"
                  accessibilityRole="button"
                  style={{
                    transform: [{ scale: attendanceStatus === 'processing' && selectedOption === 'absent' ? 0.98 : 1 }],
                    shadowOffset: { width: 0, height: 4 },
                    shadowRadius: 12,
                    shadowOpacity: 0.3,
                  }}
                >
                  {attendanceStatus === 'processing' && selectedOption === 'absent' ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator color="white" size="large" />
                      <Text className="text-white text-lg font-semibold ml-3">Processing...</Text>
                    </View>
                  ) : (
                    <>
                      
                      <View className="flex-1">
                        <Text className="text-white text-xl font-bold tracking-wider">Mark Absent</Text>
                        <Text className="text-amber-100 text-sm font-medium mt-0.5">Record your absence</Text>
                      </View>
                      <View className="w-8 h-8 bg-amber-600 rounded-full items-center justify-center border-2 border-amber-300">
                        <Text className="text-white text-sm font-bold">→</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-gray-100 rounded-2xl p-4 mt-4 active:bg-gray-200"
                  onPress={() => setAttendanceModalVisible(false)}
                  disabled={attendanceStatus !== 'idle'}
                  accessibilityLabel="Maybe later"
                  accessibilityRole="button"
                >
                  <Text className="text-gray-700 text-lg font-medium text-center">Maybe Later</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Absent Reason Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={absentReasonModalVisible}
        onRequestClose={() => setAbsentReasonModalVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-orange-100 rounded-3xl items-center justify-center mb-4">
                <Text className="text-2xl">💭</Text>
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">Reason for Absence</Text>
              <Text className="text-gray-500 text-center">Let us know what's going on</Text>
            </View>
            
            <View className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-200">
              <TextInput
                className="text-gray-800 text-base min-h-[80px]"
                placeholder="Type your reason here..."
                value={absentReason}
                onChangeText={setAbsentReason}
                multiline={true}
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="space-y-3">
              <TouchableOpacity 
                className="bg-blue-500 rounded-2xl p-4 active:bg-blue-600 shadow-sm"
                onPress={submitAbsentReason}
              >
                <Text className="text-white text-lg font-semibold text-center">Submit</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="bg-gray-100 rounded-2xl p-4 active:bg-gray-200"
                onPress={() => {
                  setAbsentReasonModalVisible(false)
                  setAbsentReason('')
                }}
              >
                <Text className="text-gray-700 text-lg font-medium text-center">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export default PreHome
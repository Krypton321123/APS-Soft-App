import { View, Text, TouchableOpacity } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

const CameraComp = () => {

    const [cameraPermission, setCameraPermission] = useState(false)

    if (!cameraPermission) {

        return <SafeAreaView className='w-full h-screen flex justify-center items-center'>
                    <TouchableOpacity onPress={() => {
                        useCameraPermissions()
                    }}>
                        <Text>Give Camera Permission</Text>
                    </TouchableOpacity>
               </SafeAreaView>
    }

  return (
    <SafeAreaView>
      <Text>
            <CameraView facing='back' className='w-full h-screen' />
      </Text>
    </SafeAreaView>
  )
}

export default CameraComp
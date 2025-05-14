import { View, Text, Button, TouchableOpacity, Image, Alert } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { CameraCapturedPicture, CameraType, CameraView, useCameraPermissions } from 'expo-camera'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { captureRef } from 'react-native-view-shot'
import * as MediaLibrary from 'expo-media-library'
 
const Camera = () => {

    const [facing, setFacing] = useState<CameraType>('back')
    const [permission, requestPermission] = useCameraPermissions(); 
    const [photoData, setPhotoData] = useState<CameraCapturedPicture | null>(null)
    const cameraRef = useRef<CameraView | null>(null)

    const [gps, setGps] = useState<Location.LocationObjectCoords | undefined>(undefined)
    const [locationData, setLocationData] = useState<Location.LocationGeocodedAddress[] | null>(null)

    useEffect(() => {
        getLocation(); 
    }, [gps])

    const getLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync(); 
        if (status !== 'granted') {
            Alert.alert('', 'Location permission was denied')
            return; 
        }

        const lastKnownLocation = await Location.getLastKnownPositionAsync({});
        
        

        if (!gps) {
            setGps(lastKnownLocation?.coords)
            
            const location = await Location.reverseGeocodeAsync({ latitude: lastKnownLocation?.coords.latitude!, longitude: lastKnownLocation?.coords.longitude! })
            setLocationData(location)
        }

        

        const currentLocation = await Location.getCurrentPositionAsync({});

        if (gps && currentLocation.coords.latitude !== gps.latitude) {
            setGps(currentLocation.coords)
        }

    }

    const date = new Date()
    const day = date.getDate()
    const month = date.getMonth(); 
    const year = date.getFullYear(); 
    const finalDate = `${day}/${month}/${year}`; 

    let savedPhoto = useRef(null); 
    const savePhoto = async () => {
        const photo = await captureRef(savedPhoto, {
            result: 'tmpfile', 
            height: 1980, 
            width: 1180, 
            quality: 0.7,
            format: 'jpg'
        })

        const { status } = await MediaLibrary.requestPermissionsAsync(); 

        if (status === 'granted') {
            MediaLibrary.createAssetAsync(photo); 
            Alert.alert('photo saved'); 
            setPhotoData(null); 
        }
    }
    
    const takePicture = async () => {
        const data = await cameraRef.current?.takePictureAsync(); 
        if (data === undefined) return; 
        setPhotoData(data); 
    }

    if (!permission) {
        return <View />
    }

    if (!permission.granted) {
        return <View className='flex-1 justify-center'>
            <Text>Permission not granted</Text>
            <Button onPress={requestPermission} title='Grant permission' />
        </View>
    }

    const gpsComponent = (
        <View className='absolute'>
            {gps && locationData !== null ? (
                <View className='w-[200] h-[100] bg-black'>
                    <Text className='text-white'>{finalDate}</Text>
                    <Text className='text-white'>{gps.latitude}</Text>
                    <Text className='text-white'>{gps.longitude}</Text>
                    <Text className='text-white'>{locationData[0]?.formattedAddress}</Text>
                </View>
            ): <View>
                    <Text>Waiting</Text>
                </View>}
        </View>
        )
    

    if (photoData) {
        return (
            <View className='flex-1 relative'>
                <Image 
                source={{uri: photoData?.uri}}
                className='w-[400] h-[400]'
                />
                {gpsComponent}
            </View>
        )
    }

  return (
    <View className='flex-1 justify-center'>
        <CameraView style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}  ref={cameraRef} facing={facing}>
            <View className='w-full h-[200] flex flex-row items-center justify-around border-white '>
                {/* <View className='bg-blue-900 h-full'> */}
                    <View className='w-[75] mb-10 relative h-[75] bg-transparent  border-2 border-white rounded-full z-0 flex justify-start items-center'>
                        <TouchableOpacity onPress={takePicture} className='w-[60] absolute top-[5] z-1 rounded-full h-[60] bg-white mb-10'>

                        </TouchableOpacity>
                    </View>
                {/* </View> */}
                {/* <View className='bg-red-700 h-full'> */}
                    {/* <View className='w-[60] mb-10 h-[60] bg-black'>

                    </View> */}
                {/* </View> */}
            </View>
        </CameraView>
    </View>
  )
}

export default Camera
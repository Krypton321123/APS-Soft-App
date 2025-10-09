import { View, Text, Button, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { CameraCapturedPicture, CameraType, CameraView, useCameraPermissions } from 'expo-camera'
import { useLocalSearchParams } from 'expo-router'
import * as Location from 'expo-location'
import { captureRef } from 'react-native-view-shot'

import * as FileSystem from 'expo-file-system'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants'
import { useRouter } from 'expo-router'
import mime from 'mime'
import { startTracking } from '@/utils/locations'
 
const Camera = () => {
    // Extract the partyId from local search params
    const { partyId, caller } = useLocalSearchParams<{ partyId: string, caller: string }>();

    const [facing, setFacing] = useState<CameraType>(caller === 'attendance' ? 'front' : 'back')
    const [permission, requestPermission] = useCameraPermissions(); 
    const [photoData, setPhotoData] = useState<CameraCapturedPicture | null>(null)
    const [finalPhotoUri, setFinalPhotoUri] = useState<string | null>(null)
    const cameraRef = useRef<CameraView | null>(null)
    const [showGrid, setShowGrid] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [gps, setGps] = useState<Location.LocationObjectCoords | undefined>(undefined)
    const [locationData, setLocationData] = useState<Location.LocationGeocodedAddress[] | null>(null)
    const router = useRouter()
    const photoViewRef = useRef<View | null>(null);

    useEffect(() => {
        getLocation(); 
    }, [gps])

    const getLocation = async (): Promise<void> => {
        let { status } = await Location.requestForegroundPermissionsAsync(); 
        if (status !== 'granted') {
            Alert.alert('', 'Location permission was denied')
            return; 
        }

        const lastKnownLocation = await Location.getLastKnownPositionAsync({});
        
        if (!gps && lastKnownLocation?.coords) {
            setGps(lastKnownLocation.coords)
            
            const location = await Location.reverseGeocodeAsync({ 
                latitude: lastKnownLocation.coords.latitude, 
                longitude: lastKnownLocation.coords.longitude 
            })
            setLocationData(location)
        }

        const currentLocation = await Location.getCurrentPositionAsync({});

        if (gps && currentLocation.coords.latitude !== gps.latitude) {
            setGps(currentLocation.coords)
        }
    }

    const date = new Date()
    const day = date.getDate()
    const month = date.getMonth() + 1; // Month is 0-indexed 
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const finalDate = `${day}/${month}/${year} ${formattedHours}:${formattedMinutes}`; 
    
    

    useEffect(() => {
        if (photoData) {
            setProcessing(true); 
            setTimeout(() => {
                capturePhotoWithOverlay();
            },1000); 
        }
    }, [photoData]);


    const capturePhotoWithOverlay = async (): Promise<void> => {

        if (!photoViewRef.current || !photoData) return;
        
        try {

           
            const uri = await captureRef(photoViewRef, {
                format: 'jpg',
                quality: 0.9,
                result: 'tmpfile',
                height: 1213, // Add specific dimensions
                width: 1038,
            });
            
            setFinalPhotoUri(uri);
        } catch (error) {
            console.error("Failed to capture view:", error);
            Alert.alert("Error", "Failed to create photo with overlay");
        } finally {
            console.log("setprocessingfalse")
            setProcessing(false)
        }
    };
    
    // Process the final photo with overlay
const processPhoto = async (): Promise<void> => {

    console.log("i am here")

    if (!finalPhotoUri) {
        Alert.alert("Error", "No photo data available");
        return;
    }

    try {
        const fileInfo = await FileSystem.getInfoAsync(finalPhotoUri);
        if (!fileInfo.exists) {
            Alert.alert("Error", "Photo file not ready. Try again.");
            return;
        }

        const formData = new FormData();

        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
            throw new Error("User ID not found");
        }

        const filename = finalPhotoUri.split('/').pop();
        if (caller === 'attendance') {

           
            formData.append('userId', userId)
            formData.append('status', "present")
            formData.append('time', new Date().toLocaleDateString("en-CA", {
                timeZone: "Asia/Kolkata"
            }))
            formData.append('markedBy', userId); 
            formData.append('photo', {
                uri: finalPhotoUri,
                type: mime.getType(finalPhotoUri),
                name: filename,
            } as any);

             const response = await fetch(`${API_URL}/user/markAttendance`, {
                method: 'POST',
                headers: {
                    
                    Accept: 'application/json',
                },
                body: formData,
            });

            const data = await response.json(); 

            console.log(data)

            if (response.ok) {
                console.log("came here")
                const date = new Date().toLocaleDateString('en-IN', {
                    day: '2-digit', 
                    month: '2-digit', 
                    year: '2-digit'
                })
                await AsyncStorage.setItem("attendanceData", JSON.stringify({date, marked: "present"}))
                await startTracking()

                Alert.alert('Attendance Marked', "Attendance has been successfully marked!\nLocation Tracking has been started", [
                    {text: 'Ok', onPress: () => {router.replace('/PreHome')}}
                ])

                setPhotoData(null);
                setFinalPhotoUri(null);
            }

        } else {

            formData.append('userId', userId);
            formData.append('partyId', partyId);
            formData.append('photo', {
                uri: finalPhotoUri,
                type: mime.getType(finalPhotoUri),
                name: filename,
            } as any);

            console.log(finalPhotoUri); 

            const response = await fetch(`${API_URL}/user/uploadwithmulter`, {
                method: 'POST',
                headers: {
                    
                    Accept: 'application/json',
                },
                body: formData,
            });

            console.log(response)

            const data = await response.json();

            if (response.ok) {
                console.log("here i ma")
                setPhotoData(null);
                setFinalPhotoUri(null);
                return Alert.alert("Success", "Photo uploaded successfully!", [
                    { text: 'OK', onPress: () => router.back() }
                ]);

                
            } else {
                throw new Error(data?.message || 'Failed to upload image');
            }
    }
    } catch (error) {
        console.error("Error processing photo:", error);
        Alert.alert("Error", error instanceof Error ? error.message : "Failed to process photo");
    }
};
    const takePicture = async (): Promise<void> => {
        const data = await cameraRef.current?.takePictureAsync(); 
        if (!data) return; 
        setPhotoData(data); 
    }
    
    if (!permission) {
        return <View />
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center p-5">
                <Ionicons name="camera-outline" size={60} color="#888" />
                <Text className="text-2xl font-bold mt-5 mb-2">Camera access needed</Text>
                <Text className="text-base text-gray-600 text-center mb-8">
                    Please grant camera permission to take party photos
                </Text>
                <TouchableOpacity 
                    className="bg-blue-500 py-3 px-8 rounded-lg"
                    onPress={requestPermission}
                >
                    <Text className="text-white font-bold text-lg">Grant Access</Text>
                </TouchableOpacity>
            </View>
        )
    }

    const gpsComponent = (
        <View className="absolute bottom-0 left-0 right-0 overflow-hidden">
            <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)']}
                className="w-full py-2 px-4"
                collapsable={false}
            >
                <View className="w-full">
                    <View className="flex-row items-center mb-1">
                        <Ionicons name="location" size={16} color="#fff" />
                        <Text className="text-white font-bold text-sm ml-1">Location Data</Text>
                    </View>
                    
                    <View className="pl-1">
                        <Text className="text-white text-sm">{finalDate}</Text>
                        {gps && (
                            <Text className="text-white text-xs opacity-90">
                                {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
                            </Text>
                        )}
                        {locationData && locationData[0]?.formattedAddress && (
                            <Text className="text-white text-xs opacity-90 mt-0.5" numberOfLines={2}>
                                {locationData[0].formattedAddress}
                            </Text>
                        )}
                        
                        <View className="flex-row items-center mt-1.5 bg-black/40 self-start py-0.5 px-2 rounded-full">
                            <Ionicons name="people" size={14} color="#fff" />
                            <Text className="text-white font-bold text-xs ml-1">Party ID: {partyId}</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </View>
    )
    
    if (photoData) {
        return (
            <View className="flex-1 bg-black pt-12">
                <View className="items-center py-4">
                    <Text className="text-white text-2xl font-bold">Photo Preview</Text>
                    <Text className="text-gray-300 text-base mt-1">Party ID: {partyId}</Text>
                </View>
                
                {/* This is the capturable view that includes both photo and overlay */}
                <View 
                    className="relative mx-2 rounded-xl overflow-hidden h-3/5" 
                    ref={photoViewRef}
                    collapsable={false}
                >
                    <Image 
                        source={{uri: photoData?.uri}}
                        className="w-full h-full rounded-xl"
                    />
                    {gpsComponent}
                </View>
                
                <View className="flex-row justify-evenly mt-8">
                    <TouchableOpacity
                        onPress={() => {
                            setPhotoData(null);
                            setFinalPhotoUri(null);
                        }}
                        className="bg-gray-600 py-3 px-6 rounded-xl flex-row items-center justify-center min-w-32"
                    >
                        <Ionicons name="refresh" size={24} color="#fff" />
                        <Text className="text-white font-bold text-base ml-2">Retake</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        onPress={processPhoto}
                        className={` py-3 px-6 rounded-xl flex-row items-center justify-center min-w-32 ${
                            finalPhotoUri ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        disabled={!finalPhotoUri && !processing}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="#fff" />
                        <Text className="text-white font-bold text-base ml-2">Use Photo</Text>
                    </TouchableOpacity>
                </View>
                
                {!finalPhotoUri && (
                    <View className="absolute bottom-24 left-0 right-0 items-center">
                        <Text className="text-white text-sm">Processing image...</Text>
                    </View>
                )}
            </View>
        )
    }

    return (
        <View className="flex-1 bg-black">
            {/* Camera Header */}
            <View className="absolute top-0 left-0 right-0 z-10 pt-12 pb-4 bg-gradient-to-b from-black/70 to-transparent">
                <View className="flex-row items-center justify-between px-5">
                    <View className="bg-black/40 rounded-full py-1 px-3">
                        <Text className="text-white text-sm font-medium">
                            Party: {partyId || 'Unknown'}
                        </Text>
                    </View>
                    <View className="flex-row space-x-4">
                        <TouchableOpacity 
                            onPress={() => setShowGrid(!showGrid)}
                            className="justify-center items-center"
                        >
                            <Ionicons 
                                name="grid" 
                                size={24} 
                                color={showGrid ? "#3b82f6" : "#fff"} 
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            
            {/* Camera View with Optional Grid */}
            <CameraView 
                style={{ flex: 1 }}  
                ref={cameraRef} 
                facing={facing}
            >
                {showGrid && (
                    <View className="absolute top-0 left-0 right-0 bottom-0 flex-row justify-between opacity-30">
                        <View className="h-full w-px bg-white" style={{left: '33%'}} />
                        <View className="h-full w-px bg-white" style={{left: '66%'}} />
                        <View className="w-full h-px bg-white absolute" style={{top: '33%'}} />
                        <View className="w-full h-px bg-white absolute" style={{top: '66%'}} />
                    </View>
                )}
            </CameraView>
            
            {/* Camera Controls */}
            <View className="absolute bottom-0 left-0 right-0 pb-8 bg-gradient-to-t from-black/70 to-transparent">
                <View className="flex-row justify-center items-center">
                    {/* Flip Button */}
                    <TouchableOpacity 
                        className="absolute left-8 w-12 h-12 rounded-full bg-black/50 justify-center items-center"
                        onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                    >
                        <Ionicons name="camera-reverse" size={28} color="#fff" />
                    </TouchableOpacity>
                    
                    {/* Shutter Button */}
                    <TouchableOpacity 
                        onPress={takePicture} 
                        className="w-20 h-20 rounded-full border-4 border-white/30 justify-center items-center"
                    >
                        <View className="w-16 h-16 rounded-full bg-white" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

export default Camera
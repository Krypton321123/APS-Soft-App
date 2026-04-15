import { useEffect, useState, useRef, createRef } from "react";
import { Alert, Platform, Text, TextInput, ToastAndroid, TouchableOpacity, View, KeyboardAvoidingView, findNodeHandle, Modal } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { SafeAreaView } from "react-native-safe-area-context";
import ky from 'ky'
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants";
import { useUserId } from "@/store/userIdStore";
import Entypo from '@expo/vector-icons/Entypo';
import useTimer from "@/hooks/useTimer";
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from "react-native-popup-menu";
import { useRouter } from "expo-router";

export default function Delivery() {

    const [value, setValue] = useState(''); 
    const [collectionValue, setCollectionValue] = useState(''); 
    const [userAreaCode, setUserAreaCode] = useState(''); 
    const [finalBillNo, setFinalBillNo] = useState(''); 
    const [data, setData] = useState<any>(null)
    const [otpScreen, setOtpScreen] = useState(false); 
    
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', ''])
    const references = useRef<any>([])
    const router = useRouter()
    const { formattedTime, reset } = useTimer({
      initialTime: 300, 
      onComplete: () => {Alert.alert("Time expired", 'Request another OTP'), reset()}, 
      isActive: otpScreen
    })
    const { userId } = useUserId(); 


    useEffect(() => {
      references.current = otp.map(
      (_, i) => references.current[i] ?? createRef()
    );
    }, [otp.length])

    const keyboardRef = useRef<KeyboardAwareScrollView | null>(null); 

    const findNode = (node: any) => {
        keyboardRef.current?.scrollToFocusedInput(node); 
    }

    useEffect(() => {
        const getAreaCode = async () => {
            const temp = await AsyncStorage.getItem("userAreaCode"); 
            if (temp) {
                return setUserAreaCode(temp); 
            }
        }

        getAreaCode(); 
    }, [])

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

    const handlesubmitOtp = async () => {
      console.log(otp.join("").length); 
        if (otp.join("").length !== 6 ) return Alert.alert('OTP Not valid', 'You have not added a valid OTP'); 

        try {

          const response: any = await ky.post(`${API_URL}/delivery/saveDelivery`, {json: {
            userId, billNo: finalBillNo, cash: collectionValue, otp: otp.join("")  
          }}).json()

          console.log(response)

          if (response.statusCode === 200) {
            setOtpScreen(false); 
            return Alert.alert('Successfully updated', "Delivery Information successfully updated"); 
          } else if (response.statusCode === 409) {
            return ToastAndroid.show("OTP Not Matched ", ToastAndroid.SHORT); 
          }
           else {
            console.error(response)
            return Alert.alert('Error', 'error occured')
          }

        } catch (err: any) {
          console.error("unexpected bs -->", err)
          return Alert.alert('Error', 'Unexpected error occured')
        }
    }

    const makeBillNo = () => {
        const paddedBillNo = value.trim().padStart(5, '0'); 
        const currentYearCode = Number(new Date().getFullYear().toString().split('0')[1]) + 1; 

        return `${userAreaCode}TAX${currentYearCode}A${paddedBillNo}`
    }

    const handleValueChange = (text: string) => {
        if (value.length < 5 || text.length < 5) {
            return setValue(text.trim()); 
        }
        return; 
    }

    const handleShowInfo = async () => {
        if (value.trim() === "") {
            return Alert.alert("Bill no is empty", "Bill No is empty"); 
        }

        const billNo = makeBillNo();
        setFinalBillNo(billNo); 

        const response: any = await ky.post(`${API_URL}/delivery/getData`, {json: {billNo}}).json(); 

        console.log(response)

        if (response.statusCode === 200) {
            ToastAndroid.show("Data fetched successfully", ToastAndroid.SHORT)
            return setData(response.data); 
        } else {
            return Alert.alert("Failure", "Data could not be fetched"); 
        }

    }

    const handleGetOTP = async () => {
      if (data.mobile.length !== 10) {
        return Alert.alert("Not Valid", "The mobile number of the party is not valid")
      }

      try {

        const response: any = await ky.post(`${API_URL}/delivery/generateOtp`, {
          json: {
            mobileNumber: data.mobile, partyName: data.ptynm, userId, billNo: finalBillNo
          }
        }).json()

        console.log(response)

        if (response.statusCode === 200) {
          return setOtpScreen(true); 
        } else {
          return Alert.alert('Error', 'Unable to send OTP')
        }

      } catch (err: any){ 
        return Alert.alert("Not Valid", err.message)
      }
    }

    return (
        
    <SafeAreaView className="flex-1 bg-white">

        {data && <Modal visible={otpScreen} animationType="fade" statusBarTranslucent={true} transparent={true}>
        <View className='flex-1 bg-black/40 justify-center items-center'>
            <View className='flex rounded-3xl w-3/4 h-1/3 bg-white'>
                <View className='title w-full py-4 mb-6 flex justify-center items-center mt-3'>
                  <Text className='text-2xl font-GeistRegular'>Enter OTP Sent To:</Text>
                  <Text className='text-lg font-GeistRegular'>{data.mobile || ''}</Text>
                  <TouchableOpacity className="absolute top-0.5 right-3" onPress={() => {setOtpScreen(false); Alert.alert('OTP Cancelled', 'Please regenerate OTP!')}}>
                    <Entypo  name="circle-with-cross" size={24} color="black" />
                  </TouchableOpacity>
                  
                </View>
                
                <View  className='flex flex-row gap-1 justify-center input'>
                  {otp.map((item, index) => {
                    return (
                      
                          <TextInput ref={references.current[index]} textAlign='center' textAlignVertical='center' onChangeText={
                            (text: string) => {
                               console.log(references.current[index])
                              const copy = [...otp]; 
                              copy[index] = text; 
                              setOtp(copy)
                       
                              if (text && references.current[index+1]) {
                                console.log("came here")
                                references.current[index+1].current.focus(); 
                              }
                            }
                          } onKeyPress={(e: any) => {
                            if (index === 0) {
                              return; 
                            }
                            if (index > 0 && e.nativeEvent.key === "Backspace") {
                              references.current[index-1].current.focus()
                            }
                          }} key={index} inputMode='numeric' className='border-b pb-0 text-xl rounded-lg w-10 h-10'>

                          </TextInput>
                      
                    )
                  })}
                </View>
               
                <View className='submitBtn flex-1 justify-center items-center'>
                  <TouchableOpacity onPress={handlesubmitOtp} className='flex rounded-3xl justify-center items-center w-1/2 h-16 bg-blue-600'>
                    <Text className='text-white font-GeistSemiBold'>Submit OTP</Text>
                  </TouchableOpacity>

                  <Text className="mt-4">
                    Time: {formattedTime}
                  </Text>
                </View>
            </View>
        </View>
      </Modal>}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
      >
        <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="w-full h-24 bg-blue-600 flex flex-row justify-between p-4 items-center">
            <Text className="text-white text-2xl font-GeistSemiBold tracking-tighter">
              Delivery Screen
            </Text>
              <Menu>
                <MenuTrigger>
                  <MaterialIcons name="menu" size={30} color="white" />
                </MenuTrigger>
                <MenuOptions>
                  <MenuOption onSelect={() => handleLogout()}>
                    <Text className="text-lg text-red-600">Logout</Text>
                  </MenuOption>     
                </MenuOptions>
              </Menu>
          </View>

          <View className="w-full h-36 flex flex-col mt-5 ml-5 gap-3">
            <Text className="text-2xl font-GeistBold">Bill No</Text>
            <View className="flex flex-row items-center bg-gray-300 border border-gray-400/60 rounded-lg w-72 p-3">
              <Text>{userAreaCode}</Text>
              <TextInput
                className="text-black font-GeistRegular pt-4 w-5/6 rounded-lg bg-gray-300"
                cursorColor={"black"}
                selectionColor={"blue"}
                keyboardType={"number-pad"}
                value={value}
                onChangeText={handleValueChange}
              />
              <TouchableOpacity
                onPress={handleShowInfo}
                className="ml-9 rounded-lg p-2 bg-blue-600 h-12 flex justify-center items-center"
              >
                <Text className="text-white font-GeistRegular tracking-tighter">Show Info</Text>
              </TouchableOpacity>
            </View>
          </View>

          {finalBillNo !== "" && (
            <View className="ml-4">
              <Text className="text-lg font-GeistRegular">Bill No: {finalBillNo}</Text>
            </View>
          )}

          {data !== null && (
            <View className="mt-2 w-full bg-gray-200">
              <View className="p-4 flex gap-2">
                <Text className="text-lg font-GeistSemiBold tracking-tighter">
                  Party Name: <Text className="text-md font-GeistRegular">{data.ptynm}</Text>
                </Text>
                <Text className="text-lg font-GeistSemiBold tracking-tighter">
                  Mobile: <Text className="text-md font-GeistRegular">{data.mobile || ''}</Text>
                </Text>
                <Text className="text-lg font-GeistSemiBold tracking-tighter">
                  Address: <Text className="text-md font-GeistRegular">{data.addr}</Text>
                </Text>
                <Text className="text-lg font-GeistSemiBold tracking-tighter">
                  Total Amount: <Text className="text-md font-GeistRegular">{Math.round(data.amt)}</Text>
                </Text>
                <Text className="text-lg font-GeistSemiBold tracking-tighter">
                  Bill Date: <Text className="text-md font-GeistRegular">{data.billdt}</Text>
                </Text>
                <Text className="text-lg font-GeistSemiBold tracking-tighter">
                  Total Quantity: <Text className="text-md font-GeistRegular">{data.totqty}</Text>
                </Text>
              </View>
            </View>
          )}

          {data !== null && (
            <View className="w-full mt-4 flex justify-center items-center">
                <Text className="w-full mb-1 text-lg font-GeistBold text-start ml-16">
                    Collection Amount
                </Text>
              <TextInput
                className="text-black pl-3 h-12 text-lg font-GeistRegular w-5/6 rounded-lg bg-gray-300"
                cursorColor={"black"}
                selectionColor={"blue"}
                keyboardType="number-pad"
                value={collectionValue}
                onChangeText={(text: string) => {
                    setCollectionValue(text)
                }}
                onFocus={(e: any) => {
                    const node = findNodeHandle(e.target); 
                    if (node) {findNode(node); console.log(node)}
                }}
              />
             {(data && data.mobile) ? <TouchableOpacity onPress={handleGetOTP} className="mt-5 px-20 py-4 bg-blue-600 rounded-lg">
                <Text className="text-white tracking-tighter font-GeistSemiBold">Get OTP</Text>
              </TouchableOpacity> : <Text className="text-lg tracking-tighter m-4 font-GeistSemiBold text-red-600">No valid mobile number available. Please Contact to Head Office on 9520996604.</Text>}
            </View>
          )}
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    )
}
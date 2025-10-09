import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { API_URL } from '@/constants'

const EditParty = () => {
  const { partyId, partyName } = useLocalSearchParams()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    lednm: '',
    ledadr1: '',
    contactPerson: '',
    mobileNumber: '',
    emailId: '',
    shopImage1: null,
    shopImage2: null
  })
  
  const [loading, setLoading] = useState(true)
  
  // Fetch party details on component mount
  useEffect(() => {
    // In a real app, we would fetch the party details from the API
    // For now, we'll just set the party name from the params
    setFormData(prev => ({
      ...prev,
      lednm: partyName as string || '',
    }))
    setLoading(false)
  }, [])
  
  const handleInputChange = (field: any, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  const pickImage = async (imageType: any) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    })
    
    if (!result.canceled) {
      setFormData(prev => ({
        ...prev,
        [imageType]: result.assets[0].uri
      }))
    }
  }
  
  const takePhoto = async (imageType: any) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos')
      return
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    })
    
    if (!result.canceled) {
      setFormData(prev => ({
        ...prev,
        [imageType]: result.assets[0].uri
      }))
    }
  }
  
  const handleSubmit = () => {
    // In a real app, we would send the form data to the API
    console.log('Form submitted with data:', {
      partyId,
      ...formData
    })
    
    Alert.alert(
      'Success',
      'Party details updated successfully!',
      [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]
    )
  }
  
  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <Text className="text-lg font-GeistRegular">Loading...</Text>
      </SafeAreaView>
    )
  }
  
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : -30}
      >
        {/* Header */}
        <View className="bg-blue-600 px-4 py-4 flex-row justify-between items-center">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-GeistBold">Edit Party</Text>
          </View>
          <Text className="text-white text-sm">ID: {partyId}</Text>
        </View>
        
        <ScrollView className="flex-1 p-4">
          {/* Form Fields */}
          <View className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <Text className="text-lg font-GeistSemiBold mb-4 text-gray-800">Basic Information</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-GeistRegular text-gray-600 mb-1">Party Name*</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 text-gray-800 bg-gray-50"
                value={formData.lednm}
                onChangeText={(text) => handleInputChange('lednm', text)}
                placeholder="Enter party name"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-GeistRegular text-gray-600 mb-1">Address</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 text-gray-800 bg-gray-50"
                value={formData.ledadr1}
                onChangeText={(text) => handleInputChange('ledadr1', text)}
                placeholder="Enter address"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-GeistRegular text-gray-600 mb-1">Contact Person</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 text-gray-800 bg-gray-50"
                value={formData.contactPerson}
                onChangeText={(text) => handleInputChange('contactPerson', text)}
                placeholder="Enter contact person name"
              />
            </View>
          </View>
          
          <View className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <Text className="text-lg font-GeistSemiBold mb-4 text-gray-800">Contact Details</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-GeistRegular text-gray-600 mb-1">Mobile Number</Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg bg-gray-50">
                <View className="px-3 py-3 border-r border-gray-300">
                  <Text className="text-gray-600">+91</Text>
                </View>
                <TextInput
                  className="flex-1 p-3 text-gray-800"
                  value={formData.mobileNumber}
                  onChangeText={(text) => handleInputChange('mobileNumber', text)}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>
            
            <View className="mb-2">
              <Text className="text-sm font-GeistRegular text-gray-600 mb-1">Email ID</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 text-gray-800 bg-gray-50"
                value={formData.emailId}
                onChangeText={(text) => handleInputChange('emailId', text)}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
          
          {/* Shop Images */}
          <View className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <Text className="text-lg font-GeistSemiBold mb-4 text-gray-800">Shop Images</Text>
            
            <Text className="text-sm text-gray-500 mb-3">Add up to 2 images of your shop</Text>
            
            {/* First Image */}
            <View className="mb-4">
              <Text className="text-sm font-GeistRegular text-gray-600 mb-2">Image 1</Text>
              {formData.shopImage1 ? (
                <View className="relative">
                  <Image 
                    source={{ uri: formData.shopImage1 }} 
                    className="w-full h-48 rounded-lg"
                    resizeMode="cover"
                  />
                  <View className="absolute bottom-2 right-2 flex-row">
                    <TouchableOpacity 
                      className="w-9 h-9 rounded-full bg-red-500 items-center justify-center"
                      onPress={() => handleInputChange('shopImage1', null)}
                    >
                      <Ionicons name="trash" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View className="w-full h-36 rounded-lg bg-gray-200 justify-center items-center border border-dashed border-gray-400">
                  <View className="items-center">
                    <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                    <Text className="text-gray-500 mt-2 mb-3">Add Shop Image</Text>
                    <View className="flex-row">
                      <TouchableOpacity 
                        className="bg-blue-500 px-3 py-2 rounded-lg mr-2 flex-row items-center"
                        onPress={() => pickImage('shopImage1')}
                      >
                        <Ionicons name="images" size={16} color="white" className="mr-1" />
                        <Text className="text-white font-GeistRegular">Gallery</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        className="bg-green-500 px-3 py-2 rounded-lg flex-row items-center"
                        onPress={() => takePhoto('shopImage1')}
                      >
                        <Ionicons name="camera" size={16} color="white" className="mr-1" />
                        <Text className="text-white font-GeistRegular">Camera</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
            
            {/* Second Image */}
            <View>
              <Text className="text-sm font-GeistRegular text-gray-600 mb-2">Image 2</Text>
              {formData.shopImage2 ? (
                <View className="relative">
                  <Image 
                    source={{ uri: formData.shopImage2 }} 
                    className="w-full h-48 rounded-lg"
                    resizeMode="cover"
                  />
                  <View className="absolute bottom-2 right-2 flex-row">
                    <TouchableOpacity 
                      className="w-9 h-9 rounded-full bg-red-500 items-center justify-center"
                      onPress={() => handleInputChange('shopImage2', null)}
                    >
                      <Ionicons name="trash" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View className="w-full h-36 rounded-lg bg-gray-200 justify-center items-center border border-dashed border-gray-400">
                  <View className="items-center">
                    <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                    <Text className="text-gray-500 mt-2 mb-3">Add Shop Image</Text>
                    <View className="flex-row">
                      <TouchableOpacity 
                        className="bg-blue-500 px-3 py-2 rounded-lg mr-2 flex-row items-center"
                        onPress={() => pickImage('shopImage2')}
                      >
                        <Ionicons name="images" size={16} color="white" className="mr-1" />
                        <Text className="text-white font-GeistRegular">Gallery</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        className="bg-green-500 px-3 py-2 rounded-lg flex-row items-center"
                        onPress={() => takePhoto('shopImage2')}
                      >
                        <Ionicons name="camera" size={16} color="white" className="mr-1" />
                        <Text className="text-white font-GeistRegular">Camera</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
          
          {/* Extra space at bottom for keyboard */}
          <View className="h-20" />
        </ScrollView>
        
        {/* Submit Button */}
        <View className="p-4 bg-white border-t border-gray-200">
          <TouchableOpacity 
            className="bg-blue-600 p-4 rounded-lg items-center"
            onPress={handleSubmit}
          >
            <Text className="font-GeistBold text-white text-lg">Save Changes</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default EditParty
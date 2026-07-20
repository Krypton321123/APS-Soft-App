import {ScrollView, Text, TouchableOpacity, View, FlatList, ActivityIndicator, TextInput, Modal } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { useUserId } from '@/store/userIdStore'
import ky from 'ky'
import { API_URL } from '../constants'
import { SafeAreaView } from 'react-native-safe-area-context'
 


const Home = () => {
    const router = useRouter()
    const { username, userId } = useUserId()
    const [loading, setLoading] = useState(false)
    const [parties, setParties] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filteredParties, setFilteredParties] = useState([])
    const [currentDay, setCurrentDay] = useState('')

    // ── New Party entry point ────────────────────────────────────────────
    // Collects name + mobile here (lightweight modal, no dedicated screen),
    // then hands off to NewPartyOrder for the photo + item-picking flow.
    const [newPartyModalVisible, setNewPartyModalVisible] = useState(false)
    const [newPartyName, setNewPartyName] = useState('')
    const [newPartyMobile, setNewPartyMobile] = useState('')
    const [newPartyAddress, setNewPartyAddress] = useState('')
    const [newPartyPincode, setNewPartyPincode] = useState('')
    // Optional — unlike the fields above, this doesn't gate newPartyFormValid.
    const [newPartyGstNumber, setNewPartyGstNumber] = useState('')

    const openNewPartyModal = () => {
        setNewPartyName('')
        setNewPartyMobile('')
        setNewPartyAddress('')
        setNewPartyPincode('')
        setNewPartyGstNumber('')
        setNewPartyModalVisible(true)
    }

    const handleNewPartyContinue = () => {
        if (!newPartyName.trim()) {
            return
        }
        if (newPartyMobile.trim().length !== 10) {
            return
        }
        if (!newPartyAddress.trim()) {
            return
        }
        if (newPartyPincode.trim().length !== 6) {
            return
        }
        setNewPartyModalVisible(false)
        router.push({
            pathname: '/order/NewPartyOrder',
            params: {
                userId: userId,
                partyName: newPartyName.trim(),
                partyMobile: newPartyMobile.trim(),
                address: newPartyAddress.trim(),
                pincode: newPartyPincode.trim(),
                // Only sent when provided — NewPartyOrder / the create
                // endpoint treat this as optional, same as the backend.
                ...(newPartyGstNumber.trim() ? { gstNumber: newPartyGstNumber.trim() } : {}),
            },
        } as any)
    }

    const newPartyFormValid =
        newPartyName.trim().length > 0 &&
        newPartyMobile.trim().length === 10 &&
        newPartyAddress.trim().length > 0 &&
        newPartyPincode.trim().length === 6

    

    const fetchData = async (userToFetch: string) => {
        if (!userToFetch) {
            console.log("No username provided for fetching data")
            return
        }
        
        console.log("Fetching data for user:", userToFetch)
        try {
            setLoading(true)
            const response: any = await ky.post(`${API_URL}/user/fetchParty`, {
                json: { 
                    username: userToFetch,
                    day: currentDay
                }
            }).json()

            console.log(response)
            
            if (response.success && response.data) {
                setParties(response.data)
                setFilteredParties(response.data)
            }
        } catch (err) {
            console.log("Error fetching parties:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
        const today = new Date().getDay() // 0 is Sunday, 1 is Monday, etc.
        const currentDay = days[today]
        // Sunday is a valid beat day, so no day is excluded here
        console.log("Current day:", currentDay)
        if (currentDay) {
            setCurrentDay(currentDay)
        } 
    }, []) // Empty dependency array means this runs once on mount


    useEffect(() => {
        if (userId) {
            fetchData(userId)
        }
    }, [userId, currentDay]) // Add currentDay as dependency to refetch when day changes

    useEffect(() => {
        // Filter parties based on search query
        if (searchQuery.trim() === '') {
            setFilteredParties(parties)
        } else {
            const filtered = parties.filter((party: any) => 
                party.lednm.toLowerCase().includes(searchQuery.toLowerCase())
            )
            setFilteredParties(filtered)
        }
    }, [searchQuery, parties])

    const handleSearch = (text: string) => {
        setSearchQuery(text)
    }

    

    const renderPartyItem = ({ item }: {item: any}) => (
      <TouchableOpacity 
          className="bg-white p-4 rounded-lg shadow-sm mb-3 mx-2 border border-gray-200"
          onPress={() => router.push(`/party/${item.ledcd}/${item.lednm}` as any)}
      >
          <Text className="font-GeistBold text-lg">{item.lednm}</Text>
          <Text className="text-gray-600 mt-1">{item.ledadr1}</Text>
          <Text className=' mt-1 font-bold text-lg text-black'>OUTS: {item.outs}</Text>
      </TouchableOpacity>
  )

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#0000ff" />
                <Text className="mt-2">Loading parties...</Text>
            </View>
        )
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="bg-blue-600 px-4 pt-6 pb-2">
                {/* Header with Welcome and Logout */}
                <View className="flex-row items-start justify-between mb-1">
                    <View className="flex-shrink mr-2" style={{ maxWidth: '48%' }}>
                        <Text
                            className="text-white text-xl font-GeistBold"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            Welcome, <Text className='text-lg'>{username}</Text>
                        </Text>
                        <Text className="text-white text-sm">BEAT / {currentDay}</Text>
                    </View>
                    <View className="flex-row items-center flex-shrink">
                        <TouchableOpacity
                            className="bg-emerald-600 px-3 py-2 mr-2 rounded-lg flex-row items-center flex-shrink"
                            onPress={openNewPartyModal}
                        >
                            <Text className="text-white mr-1">+</Text>
                            <Text
                                className="text-white font-GeistBold"
                                numberOfLines={1}
                                adjustsFontSizeToFit
                            >
                                New Party
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="bg-slate-900 px-3 py-2 rounded-lg flex-shrink"
                            onPress={() => router.push({ pathname: '/summary/PreSummary', params: {userId: userId, username: username} })}
                        >
                            <Text
                                className="text-white font-GeistBold"
                                numberOfLines={1}
                                adjustsFontSizeToFit
                            >
                                Summary
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
                
                {/* Search Bar */}
                <View className="bg-white rounded-lg flex-row items-center px-3 py-2 mb-2 mt-2">
                    <Text className="mr-2">🔍</Text>
                    <TextInput
                        className="flex-1"
                        placeholder="Search parties by name..."
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Text className="ml-2 text-gray-500">✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Weekday Tabs */}
            <View className="bg-white border-b border-gray-200">
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    className="py-2"
                >
                   {['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map((day) => (
                        <TouchableOpacity
                            key={day}
                            onPress={() => setCurrentDay(day)}
                            className={`px-4 py-2 mx-1 rounded-full ${currentDay === day ? 'bg-blue-100' : ''}`}
                        >
                            <Text 
                                className={`${currentDay === day ? 'text-blue-600 font-GeistBold' : 'text-gray-600'}`}
                            >
                                {day}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            
            {filteredParties.length > 0 ? (
                <FlatList
                    data={filteredParties}
                    renderItem={renderPartyItem}
                    keyExtractor={item => item.ledcd}
                    contentContainerStyle={{ padding: 12 }}
                />
            ) : (
                <View className="flex-1 justify-center items-center">
                    <Text className="text-gray-500">
                        {parties.length > 0 
                            ? `No parties matching "${searchQuery}"` 
                            : "No parties found"}
                    </Text>
                </View>
            )}

            {/* New Party modal — collects name + mobile, then hands off to
                NewPartyOrder where the photo + items are captured */}
            <Modal
                visible={newPartyModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setNewPartyModalVisible(false)}
            >
                <View className="flex-1 bg-black/40 justify-center px-6">
                    <View className="bg-white rounded-xl p-5">
                        <Text className="text-lg font-GeistBold text-gray-800 mb-1">
                            New Party
                        </Text>
                        <Text className="text-gray-500 text-sm mb-4">
                            Enter the shop's name and mobile number to start an order.
                        </Text>

                        <Text className="text-gray-600 text-xs mb-1">Party Name</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-gray-800"
                            placeholder="Enter shop / party name"
                            placeholderTextColor="#9CA3AF"
                            value={newPartyName}
                            onChangeText={setNewPartyName}
                            autoFocus
                        />

                        <Text className="text-gray-600 text-xs mb-1">Mobile Number</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-gray-800"
                            placeholder="10-digit mobile number"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={newPartyMobile}
                            onChangeText={(text) => setNewPartyMobile(text.replace(/[^0-9]/g, ''))}
                        />

                        <Text className="text-gray-600 text-xs mb-1">Address</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-gray-800"
                            placeholder="Enter shop address"
                            placeholderTextColor="#9CA3AF"
                            value={newPartyAddress}
                            onChangeText={setNewPartyAddress}
                            multiline
                        />

                        <Text className="text-gray-600 text-xs mb-1">Pincode</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-gray-800"
                            placeholder="6-digit pincode"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="number-pad"
                            maxLength={6}
                            value={newPartyPincode}
                            onChangeText={(text) => setNewPartyPincode(text.replace(/[^0-9]/g, ''))}
                        />

                        <Text className="text-gray-600 text-xs mb-1">GST Number (optional)</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4 text-gray-800"
                            placeholder="Enter GST number"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="characters"
                            value={newPartyGstNumber}
                            onChangeText={setNewPartyGstNumber}
                        />

                        <View className="flex-row justify-end">
                            <TouchableOpacity
                                className="px-4 py-2 mr-2"
                                onPress={() => setNewPartyModalVisible(false)}
                            >
                                <Text className="text-gray-600 font-GeistBold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`px-4 py-2 rounded-lg ${newPartyFormValid ? 'bg-emerald-600' : 'bg-gray-300'}`}
                                onPress={handleNewPartyContinue}
                                disabled={!newPartyFormValid}
                            >
                                <Text className="text-white font-GeistBold">Continue</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}

export default Home
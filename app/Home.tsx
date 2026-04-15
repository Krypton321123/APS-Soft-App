import {ScrollView, Text, TouchableOpacity, View, FlatList, ActivityIndicator, TextInput } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { useUserId } from '@/store/userIdStore'
import ky from 'ky'
import { API_URL } from '../constants'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'

const Home = () => {
    const router = useRouter()
    const { username, userId } = useUserId()
    const [loading, setLoading] = useState(false)
    const [parties, setParties] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filteredParties, setFilteredParties] = useState([])
    const [currentDay, setCurrentDay] = useState('')

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
        // Only set the day if it's a weekday (excluding Sunday)
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
                <View className="flex-row justify-between items-center mb-1">
                    <View>
                        <Text className="text-white text-xl font-GeistBold">Welcome, <Text className='text-lg'>{username}</Text></Text>
                        <Text className="text-white text-sm">BEAT / {currentDay}</Text>
                    </View>
                    <TouchableOpacity 
                        className="bg-slate-900 px-3 py-2 mr-6 mt-5 rounded-lg"
                        onPress={() => router.push({ pathname: '/summary/PreSummary', params: {userId: userId, username: username} })}
                    >
                        <Text className="text-white font-GeistBold">Summary</Text>
                    </TouchableOpacity>
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
                   {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map((day) => (
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
        </SafeAreaView>
    )
}

export default Home
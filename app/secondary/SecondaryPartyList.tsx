import { Text, View, TouchableOpacity, FlatList, ActivityIndicator, TextInput, Modal } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { API_URL } from '../../constants'
import ky from 'ky'
import { Ionicons } from '@expo/vector-icons'

interface Vendor {
  vendcd: string
  name: string | null
  adrs: string | null
  contper: string | null
  contno: string | null
}

const SecondaryPartyList = () => {
  const { ledcd, lednm, userId } = useLocalSearchParams<any>()
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── New Secondary Party entry point ──────────────────────────────────
  // Same collection pattern as Home.tsx's New Party modal: gather name +
  // mobile here, then hand off to NewPartyOrder for photo + item-picking.
  // source='secondary' + parentLedcd (this screen's ledcd) distinguish
  // this from a primary new-party entry all the way through to the DB row.
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
        userId,
        partyName: newPartyName.trim(),
        partyMobile: newPartyMobile.trim(),
        address: newPartyAddress.trim(),
        pincode: newPartyPincode.trim(),
        // Only sent when provided — same optional treatment as the
        // primary-party modal in Home.tsx.
        ...(newPartyGstNumber.trim() ? { gstNumber: newPartyGstNumber.trim() } : {}),
        source: 'secondary',
        parentLedcd: ledcd,
      },
    } as any)
  }

  const newPartyFormValid =
    newPartyName.trim().length > 0 &&
    newPartyMobile.trim().length === 10 &&
    newPartyAddress.trim().length > 0 &&
    newPartyPincode.trim().length === 6

  const fetchVendors = async () => {
    try {
      setLoading(true)
      setError(null)
      const response: any = await ky
        .get(`${API_URL}/user/getVendorsByParent`, {
          searchParams: { ledcd },
        })
        .json()

      if (response.statusCode === 200) {
        setVendors(response.data)
      } else {
        setError('Failed to fetch secondary parties')
      }
    } catch (err) {
      console.error('Error fetching vendors:', err)
      setError('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
  }, [])

  const renderVendorItem = ({ item }: { item: Vendor }) => (
    <TouchableOpacity
      className="bg-white p-4 rounded-lg shadow-sm mb-3 mx-2 border border-gray-200"
      onPress={() =>
        router.push({
          pathname: '/secondary/SecondaryPartyDetails',
          params: {
            vendcd: item.vendcd,
            vendName: item.name || 'Unknown',
            parentLedcd: ledcd,
            parentLednm: lednm,
            userId,
          },
        } as any)
      }
    >
      <Text className="font-GeistBold text-lg">{item.name || 'Unnamed'}</Text>
      {item.adrs ? (
        <Text className="text-gray-600 mt-1">{item.adrs}</Text>
      ) : null}
      {(item.contper || item.contno) && (
        <View className="flex-row items-center mt-2">
          <Ionicons name="person-outline" size={14} color="#6B7280" />
          <Text className="text-gray-500 text-sm ml-1">
            {item.contper || '—'}
            {item.contno ? `  •  ${item.contno}` : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="mt-2">Loading secondary parties...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-purple-600 px-4 pt-6 pb-4">
        <View className="flex-row justify-between items-start">
          <View className="flex-shrink mr-2" style={{ maxWidth: '50%' }}>
            <Text className="text-white text-xl font-GeistBold">
              Secondary Parties
            </Text>
            <Text
              className="text-purple-200 text-sm mt-1"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Under {lednm} • ID: {ledcd}
            </Text>
          </View>
          <View className="flex-row items-center flex-shrink" style={{ gap: 8 }}>
            <TouchableOpacity
              className="bg-white/20 px-3 py-2 rounded-lg flex-row items-center flex-shrink"
              onPress={() =>
                router.push({
                  pathname: '/secondary/SecondaryPartySummary',
                  params: { ledcd, lednm, userId },
                } as any)
              }
            >
              <Text
                className="text-white font-GeistBold"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Summary
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-emerald-600 px-3 py-2 rounded-lg flex-row items-center flex-shrink"
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
          </View>
        </View>
      </View>

      {error ? (
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <Text className="text-gray-700 mt-4 text-center">{error}</Text>
          <TouchableOpacity
            className="mt-6 bg-purple-100 px-6 py-3 rounded-full"
            onPress={fetchVendors}
          >
            <Text className="text-purple-700 font-medium">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : vendors.length > 0 ? (
        <FlatList
          data={vendors}
          renderItem={renderVendorItem}
          keyExtractor={(item) => item.vendcd}
          contentContainerStyle={{ padding: 12 }}
        />
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">No secondary parties found</Text>
        </View>
      )}

      {/* New Secondary Party modal — collects name + mobile, then hands
          off to NewPartyOrder with source='secondary' + parentLedcd set */}
      <Modal
        visible={newPartyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNewPartyModalVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-center px-6">
          <View className="bg-white rounded-xl p-5">
            <Text className="text-lg font-GeistBold text-gray-800 mb-1">
              New Secondary Party
            </Text>
            <Text className="text-gray-500 text-sm mb-4">
              Enter the shop's name and mobile number to start an order.
              This will be filed under {lednm}.
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

export default SecondaryPartyList
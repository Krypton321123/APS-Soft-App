import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
  Alert,
  ListRenderItemInfo,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import ky from "ky";
import { API_URL } from "../../constants";

// Mirrors app/order/Order.tsx closely on purpose — same list/qty/discount/
// payment UI — so the two screens feel like the same feature to the user.
// Differences: name + mobile + mandatory photo up top, no "restore today's
// order" prefill (there's no partyId to look up yet), and save posts
// multipart/form-data to /new-party-order/create instead of a JSON body.

interface Item {
  itmcd: string;
  itmnm: string;
  itmrate: number;
}

interface OrderDetail {
  itmcd: string;
  itmnm: string;
  rate: number;
  qty: number;
  amount: number;
}

type PaymentMode = "cash" | "credit";

interface OrderQuantities {
  [key: string]: number;
}

interface InputQuantities {
  [key: string]: string;
}

const NewPartyOrder: React.FC = () => {
  const router = useRouter();
  const {
    userId,
    partyName: partyNameParam,
    partyMobile: partyMobileParam,
    address: addressParam,
    pincode: pincodeParam,
    gstNumber: gstNumberParam,
    source: sourceParam,
    parentLedcd,
  } = useLocalSearchParams<any>();

  // Defaults to "primary" when not passed — keeps the existing Home.tsx
  // call site (which never sends source) working unchanged. The secondary
  // flow explicitly passes source="secondary" + parentLedcd.
  const source: "primary" | "secondary" =
    sourceParam === "secondary" ? "secondary" : "primary";

  // ── New-party specific fields ────────────────────────────────────────
  // Pre-filled from the Home screen modal (Home.tsx passes these as route
  // params), but still editable here in case something needs correcting.
  const [partyName, setPartyName] = useState<string>(
    typeof partyNameParam === "string" ? partyNameParam : "",
  );
  const [partyMobile, setPartyMobile] = useState<string>(
    typeof partyMobileParam === "string" ? partyMobileParam : "",
  );
  const [address, setAddress] = useState<string>(
    typeof addressParam === "string" ? addressParam : "",
  );
  const [pincode, setPincode] = useState<string>(
    typeof pincodeParam === "string" ? pincodeParam : "",
  );
  // Optional — unlike name/mobile/address/pincode, the modal doesn't
  // require this, so it may arrive as undefined.
  const [gstNumber, setGstNumber] = useState<string>(
    typeof gstNumberParam === "string" ? gstNumberParam : "",
  );
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [takingPhoto, setTakingPhoto] = useState<boolean>(false);

  // ── Same order-building state as Order.tsx ───────────────────────────
  const [orderQuantities, setOrderQuantities] = useState<OrderQuantities>({});
  const [inputQuantities, setInputQuantities] = useState<InputQuantities>({});
  const [discount, setDiscount] = useState<string>("0");
  const [discountBulk, setDiscountBulk] = useState<string>("0");
  const handleDiscountChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setDiscount(cleaned);
  }, []);
  const handleDiscountBulkChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setDiscountBulk(cleaned);
  }, []);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const flatListRef = useRef<FlatList<Item> | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const discountInputRef = useRef<TextInput | null>(null);
  const discountBulkInputRef = useRef<TextInput | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [creditDays, setCreditDays] = useState<string>("");
  const [consumerRate, setConsumerRate] = useState();
  const [bulkRate, setBulkRate] = useState();

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -40],
    extrapolate: "clamp",
  });

  const orderSummaryOpacity = scrollY.interpolate({
    inputRange: [0, 60, 90],
    outputRange: [1, 0.8, 0],
    extrapolate: "clamp",
  });

  useEffect(() => {
    fetchItems();
  }, [searchTerm]);

  const fetchItems = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await ky
        .post(`${API_URL}/user/getItems`, { json: { userId } })
        .json<any>();
      if (response.success && response.data) {
        setItems(response.data.items);
        setConsumerRate(response.data.consumerRate);
        setBulkRate(response.data.bulkRate);
      } else {
        setError("Failed to fetch items");
      }
    } catch (err) {
      setError("Error connecting to server");
      console.error("Error fetching items:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Camera capture ────────────────────────────────────────────────────
  // Required: there's no path to save without a photo, enforced both here
  // (button disabled state / handleSave guard) and server-side.
  const handleTakePhoto = async (): Promise<void> => {
    try {
      setTakingPhoto(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera permission required",
          "Please allow camera access to photograph the shop.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.6,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Error taking photo:", err);
      Alert.alert("Error", "Could not open camera. Please try again.");
    } finally {
      setTakingPhoto(false);
    }
  };

  const handleQuantityChange = useCallback(
    (itmcd: string, qty: string): void => {
      setInputQuantities((prev) => ({ ...prev, [itmcd]: qty }));
      const quantity = parseInt(qty) || 0;
      if (quantity <= 999) {
        setOrderQuantities((prev) => ({ ...prev, [itmcd]: quantity }));
      }
    },
    [],
  );

  // Stabilized: was `items.filter(...)` recomputed fresh on every render,
  // which meant every downstream render-prop that closes over
  // `filteredItems` (header, item renderer, footer) also had to be a new
  // reference every time — feeding straight into the FlatList remount
  // problem described below. useMemo makes this array's identity stable
  // across renders where `items` and `searchTerm` haven't changed.
  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.itmnm.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [items, searchTerm],
  );

  const totalQty = useMemo(
    () => Object.values(orderQuantities).reduce((acc, val) => acc + val, 0),
    [orderQuantities],
  );

  const totalAmount = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + (orderQuantities[item.itmcd] || 0) * item.itmrate,
        0,
      ),
    [items, orderQuantities],
  );

  const selectedItemCount = useMemo(
    () => Object.values(orderQuantities).filter((qty) => qty > 0).length,
    [orderQuantities],
  );

  const handleDiscountFocus = (): void => {
    if (discountInputRef.current) {
      discountInputRef.current.setNativeProps({
        selection: { start: 0, end: discount.length },
      });
    }
  };

  const handleDiscountBulkFocus = (): void => {
    if (discountBulkInputRef.current) {
      discountBulkInputRef.current.setNativeProps({
        selection: { start: 0, end: discountBulk.length },
      });
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!partyName.trim()) {
      Alert.alert("Missing info", "Please enter the party's name.");
      return;
    }
    if (!partyMobile.trim()) {
      Alert.alert("Missing info", "Please enter the party's mobile number.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Missing info", "Please enter the party's address.");
      return;
    }
    if (pincode.trim().length !== 6) {
      Alert.alert("Missing info", "Please enter a valid 6-digit pincode.");
      return;
    }
    if (!photoUri) {
      Alert.alert(
        "Photo required",
        "Please take a photo of the shop before saving the order.",
      );
      return;
    }

    const orderDetails: OrderDetail[] = items
      .map((item) => ({
        itmcd: item.itmcd,
        itmnm: item.itmnm,
        rate: item.itmrate,
        qty: orderQuantities[item.itmcd] || 0,
        amount: (orderQuantities[item.itmcd] || 0) * item.itmrate,
      }))
      .filter((item) => item.qty > 0);

    if (orderDetails.length === 0) {
      Alert.alert("No items", "Please add at least one item to the order.");
      return;
    }

    try {
      setSaving(true);

      // multipart/form-data — the endpoint reads name/mobile/empId/totals as
      // plain fields, orderItems as a JSON string (parsed server-side), and
      // the photo as a single file under the "photo" field name matching
      // newPartyImageUpload.single('photo') on the backend.
      const formData = new FormData();
      formData.append("partyName", partyName.trim());
      formData.append("partyMobile", partyMobile.trim());
      formData.append("address", address.trim());
      formData.append("pincode", pincode.trim());
      // Optional — only sent when the user actually entered one, so the
      // backend can tell "not provided" apart from an empty string.
      if (gstNumber.trim()) {
        formData.append("gstNumber", gstNumber.trim());
      }
      formData.append("source", source);
      // Only sent for secondary — the backend requires it exactly when
      // source is secondary and treats it as absent otherwise, so there's
      // no reason to send an empty/undefined value for primary rows.
      if (source === "secondary" && typeof parentLedcd === "string") {
        formData.append("parentLedcd", parentLedcd);
      }
      formData.append("empId", String(userId));
      formData.append("totalAmount", String(totalAmount));
      formData.append("paymentMode", paymentMode);
      formData.append(
        "creditDays",
        paymentMode === "credit" ? creditDays || "0" : "0",
      );
      if (consumerRate !== undefined) {
        formData.append("consumerRate", String(consumerRate));
      }
      if (bulkRate !== undefined) {
        formData.append("bulkRate", String(bulkRate));
      }
      formData.append("orderItems", JSON.stringify(orderDetails));

      const filename = photoUri.split("/").pop() || "shop.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1]}` : "image/jpeg";

      // RN's FormData file shape — not a web File object.
      formData.append("photo", {
        uri: photoUri,
        name: filename,
        type: fileType,
      } as any);

      await ky
        .post(`${API_URL}/new-party-order/create`, {
          body: formData,
          timeout: 30000,
        })
        .json();

      Alert.alert("Success", "New party order saved successfully!");
      router.back();
    } catch (error) {
      console.error("Error saving new party order:", error);
      Alert.alert("Error", "Failed to save order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── FlatList render props ────────────────────────────────────────────
  // These were previously plain functions declared inside the component
  // body, which meant every render created new function references. A
  // FlatList treats a new ListHeaderComponent/ListFooterComponent/
  // ListEmptyComponent reference as a different component TYPE, not an
  // update to the same one — so React unmounts the old instance and
  // mounts a fresh one instead of re-rendering it. During scroll,
  // scrollEventThrottle={16} fires ~60 times/sec; if anything in that
  // path (e.g. state reads that cause the parent to re-render) recreated
  // these functions, the header would remount mid-scroll, momentarily
  // changing layout height and reading as the whole screen — including
  // the absolutely positioned bottom Save Order bar — jumping/flickering.
  // Wrapping in useCallback with correct deps keeps the references stable
  // across renders where nothing they depend on actually changed.
  const ListHeaderComponent = useCallback((): JSX.Element => {
    return (
      <View className="py-2">
        {/* New Party Details */}
        <View className="bg-white mx-4 my-2 rounded-xl shadow-sm p-4">
          <Text className="text-gray-500 font-medium mb-3">
            New Party Details
          </Text>

          <Text className="text-gray-600 text-xs mb-1">Party Name</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-gray-800"
            placeholder="Enter shop / party name"
            placeholderTextColor="#9CA3AF"
            value={partyName}
            onChangeText={setPartyName}
          />

          <Text className="text-gray-600 text-xs mb-1">Mobile Number</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-gray-800"
            placeholder="Enter mobile number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            maxLength={10}
            value={partyMobile}
            onChangeText={(text) =>
              setPartyMobile(text.replace(/[^0-9]/g, ""))
            }
          />

          <Text className="text-gray-600 text-xs mb-1">Address</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-gray-800"
            placeholder="Enter shop address"
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <Text className="text-gray-600 text-xs mb-1">Pincode</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-gray-800"
            placeholder="6-digit pincode"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={6}
            value={pincode}
            onChangeText={(text) => setPincode(text.replace(/[^0-9]/g, ""))}
          />

          <Text className="text-gray-600 text-xs mb-1">
            GST Number (optional)
          </Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-gray-800"
            placeholder="Enter GST number"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            value={gstNumber}
            onChangeText={setGstNumber}
          />

          <Text className="text-gray-600 text-xs mb-1">Shop Photo</Text>
          {photoUri ? (
            <View className="flex-row items-center">
              <Image
                source={{ uri: photoUri }}
                className="w-20 h-20 rounded-lg mr-3"
              />
              <TouchableOpacity
                className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
                onPress={handleTakePhoto}
                disabled={takingPhoto}
              >
                <Ionicons name="camera-outline" size={18} color="#4F46E5" />
                <Text className="ml-2 text-indigo-700 font-medium text-sm">
                  Retake
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className="flex-row items-center justify-center bg-indigo-50 border border-dashed border-indigo-300 rounded-lg py-4"
              onPress={handleTakePhoto}
              disabled={takingPhoto}
            >
              {takingPhoto ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <>
                  <Ionicons name="camera" size={20} color="#4F46E5" />
                  <Text className="ml-2 text-indigo-700 font-medium">
                    Take Shop Photo (required)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View className="bg-white mx-4 my-2 rounded-xl shadow-sm p-4">
          <Text className="text-gray-500 font-medium mb-2">Order Summary</Text>
          <View className="flex-row justify-between">
            <View className="items-center bg-indigo-50 px-4 py-2 rounded-lg">
              <Text className="text-gray-500 text-xs">ITEMS</Text>
              <Text className="text-indigo-700 font-bold text-base">
                {selectedItemCount} / {items.length}
              </Text>
            </View>
            <View className="items-center bg-emerald-50 px-4 py-2 rounded-lg">
              <Text className="text-gray-500 text-xs">QUANTITY</Text>
              <Text className="text-emerald-700 font-bold text-base">
                {totalQty}
              </Text>
            </View>
            <View className="items-center bg-amber-50 px-4 py-2 rounded-lg">
              <Text className="text-gray-500 text-xs">AMOUNT</Text>
              <Text className="text-amber-700 font-bold text-base">
                ₹{totalAmount}
              </Text>
            </View>
          </View>
        </View>

        {filteredItems.length > 0 && (
          <View className="flex-row items-center bg-indigo-50 py-3 px-4 mx-4 my-1 rounded-t-xl">
            <View className="flex-1 pr-2">
              <Text className="text-indigo-800 font-medium text-sm">
                Item Name
              </Text>
            </View>
            <View className="flex-row items-center justify-end">
              <Text className="text-indigo-800 text-sm ml-8 w-16 text-center">
                Price
              </Text>
              <Text className="text-indigo-800 text-sm mx-4 w-16 text-center">
                Qty
              </Text>
              <Text className="text-indigo-800 text-sm min-w-[60px] text-right">
                Amount
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }, [
    partyName,
    partyMobile,
    address,
    pincode,
    gstNumber,
    photoUri,
    takingPhoto,
    selectedItemCount,
    items.length,
    totalQty,
    totalAmount,
    filteredItems.length,
  ]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Item>): JSX.Element => {
      const amount = (orderQuantities[item.itmcd] || 0) * item.itmrate;
      const isItemSelected = (orderQuantities[item.itmcd] || 0) > 0;

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            const currentQty = orderQuantities[item.itmcd] || 0;
            const newQty = currentQty + 1;
            handleQuantityChange(item.itmcd, newQty.toString());
          }}
          className={`flex-row items-center py-3 px-4 mx-4 mb-1 bg-white rounded-none ${
            index === filteredItems.length - 1 ? "rounded-b-xl" : ""
          } shadow-sm ${isItemSelected ? "border-l-4 border-indigo-500" : ""}`}
        >
          <View className="flex-1 pr-12">
            <Text
              className="text-gray-800 font-medium text-sm w-52"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.itmnm}
            </Text>
            <Text className="text-gray-400 text-xs mt-1 whitespace-nowrap h-12 w-20 ">
              #{item.itmcd}
            </Text>
          </View>

          <View className="flex-row items-center justify-end">
            <Text className="text-gray-700 text-sm ml-8 w-16 text-center">
              ₹{item.itmrate}
            </Text>

            <TextInput
              className="text-center w-16 text-sm bg-gray-50 rounded-lg border border-gray-200 py-1 mx-4"
              keyboardType="numeric"
              value={inputQuantities[item.itmcd] || ""}
              onChangeText={(text) => handleQuantityChange(item.itmcd, text)}
              maxLength={3}
            />

            <Text className="ml-2 font-medium text-gray-800 text-sm min-w-[60px] text-right">
              ₹{amount}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [orderQuantities, inputQuantities, filteredItems.length, handleQuantityChange],
  );

  const ListFooterComponent = useCallback((): JSX.Element | null => {
    if (filteredItems.length === 0) return null;

    return (
      <View className="pb-32">
        <View className="bg-white mx-4 my-2 rounded-xl shadow-sm p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-700 font-medium">Subtotal</Text>
            <Text className="text-gray-800 font-medium">₹{totalAmount}</Text>
          </View>

          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View>
              <Text className="text-gray-700">Discount</Text>
              <Text className="text-gray-400 text-xs mt-0.5">Consumer</Text>
            </View>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-2">
              <Text className="text-gray-500">₹</Text>
              <TextInput
                ref={discountInputRef}
                className="w-20 py-1 text-right text-sm"
                keyboardType="numeric"
                value={discount}
                onChangeText={handleDiscountChange}
                onFocus={handleDiscountFocus}
                maxLength={6}
                blurOnSubmit={false}
                importantForAutofill="no"
                autoCorrect={false}
              />
            </View>
          </View>

          <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
            <View>
              <Text className="text-gray-700">Discount</Text>
              <Text className="text-gray-400 text-xs mt-0.5">Bulk</Text>
            </View>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-2">
              <Text className="text-gray-500">₹</Text>
              <TextInput
                ref={discountBulkInputRef}
                className="w-20 py-1 text-right text-sm"
                keyboardType="numeric"
                value={discountBulk}
                onChangeText={handleDiscountBulkChange}
                onFocus={handleDiscountBulkFocus}
                maxLength={6}
                blurOnSubmit={false}
                importantForAutofill="no"
                autoCorrect={false}
              />
            </View>
          </View>

          <View className="flex-row justify-between items-center pt-3">
            <Text className="text-gray-800 font-medium text-base">
              Total Amount
            </Text>
            <Text className="text-gray-800 font-medium text-base">
              ₹{totalAmount}
            </Text>
          </View>

          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100 mt-4">
            <Text className="text-gray-700">Payment Mode</Text>
            <View className="flex-row items-center space-x-4">
              <TouchableOpacity
                className={`flex-row items-center ${paymentMode === "cash" ? "bg-indigo-100" : "bg-gray-50"} px-3 py-2 rounded-lg`}
                onPress={() => setPaymentMode("cash")}
              >
                <Ionicons
                  name={
                    paymentMode === "cash"
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={18}
                  color={paymentMode === "cash" ? "#4F46E5" : "#6B7280"}
                />
                <Text
                  className={`ml-2 ${paymentMode === "cash" ? "text-indigo-700" : "text-gray-600"}`}
                >
                  Cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-row items-center ${paymentMode === "credit" ? "bg-indigo-100" : "bg-gray-50"} px-3 py-2 rounded-lg`}
                onPress={() => setPaymentMode("credit")}
              >
                <Ionicons
                  name={
                    paymentMode === "credit"
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={18}
                  color={paymentMode === "credit" ? "#4F46E5" : "#6B7280"}
                />
                <Text
                  className={`ml-2 ${paymentMode === "credit" ? "text-indigo-700" : "text-gray-600"}`}
                >
                  Credit
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {paymentMode === "credit" && (
            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <Text className="text-gray-700">Credit Days</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-2">
                <TextInput
                  className="w-20 py-1 text-right text-sm"
                  keyboardType="numeric"
                  value={creditDays}
                  onChangeText={(text) =>
                    setCreditDays(text.replace(/[^0-9]/g, ""))
                  }
                  maxLength={3}
                  placeholder="Enter days"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }, [
    filteredItems.length,
    totalAmount,
    discount,
    discountBulk,
    handleDiscountChange,
    handleDiscountBulkChange,
    paymentMode,
    creditDays,
  ]);

  const EmptyListComponent = useCallback(
    (): JSX.Element => (
      <View className="flex-1 justify-center items-center py-16 mx-4 bg-white rounded-xl shadow-sm">
        {isLoading ? (
          <>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text className="text-gray-500 mt-4">Loading items...</Text>
          </>
        ) : error ? (
          <>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text className="text-gray-700 mt-4 text-center">{error}</Text>
            <TouchableOpacity
              className="mt-6 bg-indigo-100 px-6 py-3 rounded-full"
              onPress={fetchItems}
            >
              <Text className="text-indigo-700 font-medium">Try Again</Text>
            </TouchableOpacity>
          </>
        ) : searchTerm ? (
          <>
            <Ionicons name="search-outline" size={40} color="#9CA3AF" />
            <Text className="text-gray-500 mt-4">No matching items found</Text>
            <TouchableOpacity
              className="mt-6 bg-indigo-100 px-6 py-3 rounded-full"
              onPress={() => setSearchTerm("")}
            >
              <Text className="text-indigo-700 font-medium">Clear Search</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Ionicons name="cart-outline" size={40} color="#9CA3AF" />
            <Text className="text-gray-500 mt-4">No items available</Text>
          </>
        )}
      </View>
    ),
    [isLoading, error, searchTerm],
  );

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      style={{
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}
    >
      <StatusBar backgroundColor="#4F46E5" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <View className="flex-1">
          <Animated.View
            style={{ transform: [{ translateY: headerTranslateY }] }}
            className={`px-4 pt-6 pb-3 shadow-md ${source === "secondary" ? "bg-purple-600" : "bg-indigo-600"}`}
          >
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-white text-xl font-bold">
                  {source === "secondary"
                    ? "New Secondary Party Order"
                    : "New Party Order"}
                </Text>
                <Text
                  className={`text-sm mt-1 ${source === "secondary" ? "text-purple-200" : "text-indigo-200"}`}
                >
                  {source === "secondary"
                    ? `Unregistered secondary party${typeof parentLedcd === "string" ? ` • under ${parentLedcd}` : ""}`
                    : "Unregistered shop"}
                </Text>
              </View>
              <View
                className={`p-2 rounded-full ${source === "secondary" ? "bg-purple-500" : "bg-indigo-500"}`}
              >
                <Ionicons name="storefront-outline" size={22} color="white" />
              </View>
            </View>

            <Animated.View
              style={{ opacity: orderSummaryOpacity }}
              className="pt-2"
            >
              <View className="flex-row justify-between mb-2">
                <Text className="text-white">
                  Consumer Rate:{" "}
                  <Text className="font-bold">₹{consumerRate}</Text>
                </Text>
                <Text className="text-white">
                  Bulk Rate: <Text className="font-bold">₹{bulkRate}</Text>
                </Text>
              </View>
            </Animated.View>

            <View className="bg-white mt-2 rounded-lg flex-row items-center px-4 py-2 shadow-sm border border-gray-200">
              <Ionicons name="search" size={18} color="#6366F1" />
              <TextInput
                className="ml-2 flex-1 text-gray-800 text-sm"
                placeholder="Search items..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor="#9CA3AF"
                returnKeyType="search"
              />
              {searchTerm ? (
                <TouchableOpacity onPress={() => setSearchTerm("")}>
                  <Ionicons name="close-circle" size={18} color="#6366F1" />
                </TouchableOpacity>
              ) : null}
            </View>
          </Animated.View>

          <Animated.FlatList
            ref={flatListRef}
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.itmcd}
            ListHeaderComponent={ListHeaderComponent}
            ListFooterComponent={ListFooterComponent}
            ListEmptyComponent={EmptyListComponent}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              paddingBottom: Platform.OS === "android" ? 120 : 100,
              flexGrow: filteredItems.length === 0 ? 1 : undefined,
            }}
            style={{ flex: 1 }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true },
            )}
            scrollEventThrottle={16}
          />

          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-4 shadow-md">
            <View className="flex-row justify-between">
              <TouchableOpacity
                className="bg-gray-200 flex-row items-center justify-center rounded-full px-4 py-3 w-[45%]"
                onPress={() => router.back()}
                disabled={saving}
              >
                <Ionicons name="arrow-back" size={18} color="#4B5563" />
                <Text className="ml-2 text-gray-700 font-semibold text-sm">
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-row items-center justify-center rounded-full px-4 py-3 w-[45%] ${
                  source === "secondary"
                    ? saving
                      ? "bg-purple-400"
                      : "bg-purple-600"
                    : saving
                      ? "bg-indigo-400"
                      : "bg-indigo-600"
                }`}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text className="ml-2 text-white font-semibold text-sm">
                      Saving
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="white" />
                    <Text className="ml-2 text-white font-semibold text-sm">
                      Save Order
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default NewPartyOrder;
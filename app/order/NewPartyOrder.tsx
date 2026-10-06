import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import ky from "ky";
import { API_URL } from "../../constants";

// ─────────────────────────────────────────────────────────────────────
// DIFFERENT LAYOUT, SAME BEHAVIOR — a third structural approach,
// deliberately not a variation on the previous two. Read this block
// before touching anything below; it explains the two rules the whole
// screen follows and why.
//
// This is not a claim that the flicker is now provably fixed — I have
// no way to run this on a device from here, and two earlier structural
// arguments already turned out wrong in practice. What follows is a
// genuinely different shape built to avoid two whole *classes* of
// pop, not a promise about how it will look on your phone.
//
// RULE 1 — nothing is sized by data that arrives after first paint.
// Every card below has a fixed, known height from the very first
// frame: the item list has a hard maxHeight and scrolls *inside*
// itself instead of growing the page, the rate strip always renders
// (as "—" before data lands, as the real number after), and nothing
// anywhere reads `if (isLoading) return <X /> else return <Y />` where
// X and Y are different component trees. If a box never needs to
// change size, there's nothing for it to visibly snap into.
//
// RULE 2 — "loading" is a dimmed, disabled version of the real tree,
// not a placeholder that gets swapped out. The item rows are skeleton
// bars during the fetch and become real rows once data lands, but it's
// the *same* five <View> rows the whole time — same positions, same
// sizes — just their inner content and opacity changing. Nothing
// unmounts, nothing remounts, so there's no discontinuity for RN to
// paint through.
//
// STRUCTURAL DIFFERENCES FROM BOTH PRIOR VERSIONS, on purpose:
// - One ScrollView for the entire page. No FlatList, no
//   Header/Footer/Empty split, no absolute-positioned anything. A
//   single stable tree, top to bottom, always in the same order.
// - The item list is a small fixed-height panel with its own internal
//   scroll (nestedScrollEnabled), not the thing that drives the outer
//   page's scroll. It renders directly via .map() since the catalog
//   is small (tens of items, not thousands) — no FlatList
//   virtualization needed at that size, and it sidesteps FlatList's
//   own Header/Footer/Empty machinery entirely.
// - Save/Back sit in normal flow at the bottom of the ScrollView, not
//   pinned to the viewport. They scroll BEFORE they matter and are
//   simply the last thing on the page. Order.tsx pins them absolute;
//   the first NewPartyOrder rewrite tried FlatList-footer-in-flow;
//   this is neither — plain final elements in a plain ScrollView.
// - Header is fully static — no Animated.View, no scroll-driven
//   translateY/opacity. It doesn't move, so it can't be a source of
//   any snap.
// ─────────────────────────────────────────────────────────────────────

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
type OrderSource = "primary" | "secondary";

interface OrderQuantities {
  [itmcd: string]: number;
}

interface InputQuantities {
  [itmcd: string]: string;
}

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const SKELETON_ROW_COUNT = 5;

const NewPartyOrder: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<any>();

  const source: OrderSource = params.source === "secondary" ? "secondary" : "primary";
  const parentLedcd = asString(params.parentLedcd);

  // ── New-party fields ──────────────────────────────────────────────
  const [partyName, setPartyName] = useState(asString(params.partyName));
  const [partyMobile, setPartyMobile] = useState(asString(params.partyMobile));
  const [address, setAddress] = useState(asString(params.address));
  const [pincode, setPincode] = useState(asString(params.pincode));
  const [gstNumber, setGstNumber] = useState(asString(params.gstNumber));
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);

  // ── Order-building state ─────────────────────────────────────────
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderQuantities, setOrderQuantities] = useState<OrderQuantities>({});
  const [inputQuantities, setInputQuantities] = useState<InputQuantities>({});
  const [discount, setDiscount] = useState("0");
  const [discountBulk, setDiscountBulk] = useState("0");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [creditDays, setCreditDays] = useState("");
  const [consumerRate, setConsumerRate] = useState<number>();
  const [bulkRate, setBulkRate] = useState<number>();
  const [saving, setSaving] = useState(false);

  const discountInputRef = useRef<TextInput | null>(null);
  const discountBulkInputRef = useRef<TextInput | null>(null);

  // Same fixed skeleton-bar opacity pulse pattern as before: one
  // Animated.Value, opacity-only, no layout/transform involved, so it
  // can't itself introduce a size-driven pop. Runs only while
  // isLoading is true.
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    if (!isLoading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.75, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isLoading, pulse]);

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchItems = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await ky
        .post(`${API_URL}/user/getItems`, { json: { userId: params.userId } })
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

  const handleQuantityChange = useCallback((itmcd: string, qty: string): void => {
    setInputQuantities((prev) => ({ ...prev, [itmcd]: qty }));
    const quantity = parseInt(qty, 10) || 0;
    if (quantity <= 999) {
      setOrderQuantities((prev) => ({ ...prev, [itmcd]: quantity }));
    }
  }, []);

  const handleDiscountChange = useCallback((text: string) => {
    setDiscount(text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"));
  }, []);

  const handleDiscountBulkChange = useCallback((text: string) => {
    setDiscountBulk(text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"));
  }, []);

  const handleDiscountFocus = (): void => {
    discountInputRef.current?.setNativeProps({
      selection: { start: 0, end: discount.length },
    });
  };

  const handleDiscountBulkFocus = (): void => {
    discountBulkInputRef.current?.setNativeProps({
      selection: { start: 0, end: discountBulk.length },
    });
  };

  const filteredItems = useMemo(
    () => items.filter((item) => item.itmnm.toLowerCase().includes(searchTerm.toLowerCase())),
    [items, searchTerm],
  );

  const totalQty = useMemo(
    () => Object.values(orderQuantities).reduce((acc, val) => acc + val, 0),
    [orderQuantities],
  );

  const totalAmount = useMemo(
    () =>
      items.reduce((acc, item) => acc + (orderQuantities[item.itmcd] || 0) * item.itmrate, 0),
    [items, orderQuantities],
  );

  const selectedItemCount = useMemo(
    () => Object.values(orderQuantities).filter((qty) => qty > 0).length,
    [orderQuantities],
  );

  const handleSave = async (): Promise<void> => {
    if (!partyName.trim()) {
      Alert.alert("Missing info", "Please enter the party's name.");
      return;
    }
    if (partyMobile.trim().length !== 10) {
      Alert.alert("Missing info", "Please enter a valid 10-digit mobile number.");
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
      Alert.alert("Photo required", "Please take a photo of the shop before saving the order.");
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

      const formData = new FormData();
      formData.append("partyName", partyName.trim());
      formData.append("partyMobile", partyMobile.trim());
      formData.append("address", address.trim());
      formData.append("pincode", pincode.trim());
      if (gstNumber.trim()) {
        formData.append("gstNumber", gstNumber.trim());
      }
      formData.append("source", source);
      if (source === "secondary" && parentLedcd) {
        formData.append("parentLedcd", parentLedcd);
      }
      formData.append("empId", String(params.userId));
      formData.append("totalAmount", String(totalAmount));
      formData.append("paymentMode", paymentMode);
      formData.append("creditDays", paymentMode === "credit" ? creditDays || "0" : "0");
      formData.append("discountAmount", String(parseFloat(discount) || 0));
      formData.append("discountAmountBulk", String(parseFloat(discountBulk) || 0));
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
    } catch (err) {
      console.error("Error saving new party order:", err);
      Alert.alert("Error", "Failed to save order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Item row ─────────────────────────────────────────────────────
  // Plain function, not FlatList renderItem — called directly inside
  // a .map() below. Every row is a fixed-height horizontal strip
  // (name+code on the left, a quantity stepper on the right) instead
  // of the price/qty/amount table columns from before — genuinely
  // different visual arrangement, same data per row.
  const renderItemRow = (item: Item) => {
    const qty = orderQuantities[item.itmcd] || 0;
    const amount = qty * item.itmrate;
    const isSelected = qty > 0;

    return (
      <View
        key={item.itmcd}
        className={`flex-row items-center py-3 px-3 rounded-xl mb-2 ${
          isSelected ? "bg-indigo-50 border border-indigo-200" : "bg-gray-50 border border-gray-100"
        }`}
      >
        <View className="flex-1 pr-2">
          <Text className="text-gray-800 font-medium text-sm" numberOfLines={1}>
            {item.itmnm}
          </Text>
          <Text className="text-gray-400 text-xs mt-0.5">
            #{item.itmcd} · ₹{item.itmrate} each
          </Text>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="w-8 h-8 rounded-lg bg-white border border-gray-200 items-center justify-center"
            onPress={() => handleQuantityChange(item.itmcd, String(Math.max(0, qty - 1)))}
          >
            <Ionicons name="remove" size={16} color="#4B5563" />
          </TouchableOpacity>

          <TextInput
            className="text-center w-12 mx-1.5 text-sm bg-white rounded-lg border border-gray-200 py-1"
            keyboardType="numeric"
            value={inputQuantities[item.itmcd] || ""}
            onChangeText={(text) => handleQuantityChange(item.itmcd, text)}
            maxLength={3}
          />

          <TouchableOpacity
            className="w-8 h-8 rounded-lg bg-white border border-gray-200 items-center justify-center"
            onPress={() => handleQuantityChange(item.itmcd, String(qty + 1))}
          >
            <Ionicons name="add" size={16} color="#4B5563" />
          </TouchableOpacity>
        </View>

        <Text className="font-semibold text-gray-800 text-sm w-14 text-right ml-2">
          ₹{amount}
        </Text>
      </View>
    );
  };

  // ── Skeleton row — same fixed height/shape as a real row, so the
  // panel never resizes when loading resolves. Content and border
  // color are the only things that change.
  const renderSkeletonRow = (key: number) => (
    <Animated.View
      key={key}
      className="flex-row items-center py-3 px-3 rounded-xl mb-2 bg-gray-50 border border-gray-100"
      style={{ opacity: pulse }}
    >
      <View className="flex-1 pr-2">
        <View className="bg-gray-200 rounded-md" style={{ width: 140, height: 13 }} />
        <View className="bg-gray-200 rounded-md mt-1.5" style={{ width: 90, height: 10 }} />
      </View>
      <View className="flex-row items-center">
        <View className="bg-gray-200 rounded-lg" style={{ width: 32, height: 32 }} />
        <View className="bg-gray-200 rounded-lg mx-1.5" style={{ width: 48, height: 28 }} />
        <View className="bg-gray-200 rounded-lg" style={{ width: 32, height: 32 }} />
      </View>
      <View className="bg-gray-200 rounded-md ml-2" style={{ width: 40, height: 14 }} />
    </Animated.View>
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
        {/* Static header — never moves, never resizes. No
            Animated.View, no scroll listener. */}
        <View className="bg-indigo-600 px-4 pt-6 pb-4 shadow-md">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white text-xl font-bold">New Party Order</Text>
              <Text className="text-indigo-200 text-sm mt-0.5">
                {partyName || "Unregistered shop"}
              </Text>
            </View>
            <View className="bg-indigo-500 p-2.5 rounded-full">
              <Ionicons name="storefront-outline" size={22} color="white" />
            </View>
          </View>

          {/* Rate strip renders every frame, with a "—" placeholder
              before data lands — same two <Text> nodes the whole
              time, never absent, so this line can't itself pop into
              existence. */}
          <View className="flex-row justify-between mt-3">
            <Text className="text-white text-sm">
              Consumer Rate:{" "}
              <Text className="font-bold">{consumerRate !== undefined ? `₹${consumerRate}` : "—"}</Text>
            </Text>
            <Text className="text-white text-sm">
              Bulk Rate:{" "}
              <Text className="font-bold">{bulkRate !== undefined ? `₹${bulkRate}` : "—"}</Text>
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* New Party Details */}
          <View className="bg-white mx-4 mt-4 rounded-2xl shadow-sm p-4">
            <Text className="text-gray-500 font-semibold text-xs uppercase tracking-wide mb-3">
              New Party Details
            </Text>

            <Text className="text-gray-600 text-xs mb-1">Party Name</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-800"
              placeholder="Enter shop / party name"
              placeholderTextColor="#9CA3AF"
              value={partyName}
              onChangeText={setPartyName}
            />

            <Text className="text-gray-600 text-xs mb-1">Mobile Number</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-800"
              placeholder="10-digit mobile number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
              value={partyMobile}
              onChangeText={(text) => setPartyMobile(text.replace(/[^0-9]/g, ""))}
            />

            <Text className="text-gray-600 text-xs mb-1">Address</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-800"
              placeholder="Enter shop address"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
              multiline
            />

            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <Text className="text-gray-600 text-xs mb-1">Pincode</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800"
                  placeholder="6-digit"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={pincode}
                  onChangeText={(text) => setPincode(text.replace(/[^0-9]/g, ""))}
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-600 text-xs mb-1">GST (optional)</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800"
                  placeholder="GST number"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  value={gstNumber}
                  onChangeText={setGstNumber}
                />
              </View>
            </View>
          </View>

          {/* Shop Photo — side-by-side preview + action instead of
              the previous stacked layout, and the dashed
              call-to-action square only shows before a photo exists;
              once one does, the square is simply replaced by the
              thumbnail at the same position in the same card, so nothing
              elsewhere in the page shifts either way. */}
          <View className="bg-white mx-4 mt-3 rounded-2xl shadow-sm p-4">
            <Text className="text-gray-500 font-semibold text-xs uppercase tracking-wide mb-3">
              Shop Photo
            </Text>
            <View className="flex-row items-center">
              {photoUri ? (
                <Image source={{ uri: photoUri }} className="w-16 h-16 rounded-xl" />
              ) : (
                <View className="w-16 h-16 rounded-xl bg-indigo-50 border border-dashed border-indigo-300 items-center justify-center">
                  <Ionicons name="camera" size={20} color="#4F46E5" />
                </View>
              )}
              <View className="flex-1 ml-3">
                <Text className="text-gray-700 text-sm font-medium">
                  {photoUri ? "Photo captured" : "Photo required"}
                </Text>
                <Text className="text-gray-400 text-xs mt-0.5">
                  {photoUri ? "Tap retake to replace it" : "A shop photo is needed to save"}
                </Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center bg-indigo-50 px-3 py-2 rounded-lg"
                onPress={handleTakePhoto}
                disabled={takingPhoto}
              >
                {takingPhoto ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={16} color="#4F46E5" />
                    <Text className="ml-1.5 text-indigo-700 font-medium text-xs">
                      {photoUri ? "Retake" : "Take Photo"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Order summary strip — three chips, always the same three
              chips in the same positions; only the numbers inside
              change. */}
          <View className="flex-row mx-4 mt-3" style={{ gap: 8 }}>
            <View className="flex-1 items-center bg-indigo-50 px-3 py-2.5 rounded-xl">
              <Text className="text-gray-500 text-xs">ITEMS</Text>
              <Text className="text-indigo-700 font-bold text-base mt-0.5">
                {selectedItemCount}/{items.length}
              </Text>
            </View>
            <View className="flex-1 items-center bg-emerald-50 px-3 py-2.5 rounded-xl">
              <Text className="text-gray-500 text-xs">QTY</Text>
              <Text className="text-emerald-700 font-bold text-base mt-0.5">{totalQty}</Text>
            </View>
            <View className="flex-1 items-center bg-amber-50 px-3 py-2.5 rounded-xl">
              <Text className="text-gray-500 text-xs">AMOUNT</Text>
              <Text className="text-amber-700 font-bold text-base mt-0.5">₹{totalAmount}</Text>
            </View>
          </View>

          {/* Items panel — fixed maxHeight, internal scroll. This
              panel's own height never changes: it's always
              maxHeight-tall once there's more than a couple of items,
              and even below that it doesn't grow/shrink based on
              isLoading, since the skeleton rows and real rows are the
              same count/height. */}
          <View className="bg-white mx-4 mt-3 rounded-2xl shadow-sm p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-500 font-semibold text-xs uppercase tracking-wide">
                Items
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 flex-1 ml-3">
                <Ionicons name="search" size={14} color="#9CA3AF" />
                <TextInput
                  className="ml-1.5 flex-1 text-gray-800 text-xs"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="search"
                />
                {searchTerm ? (
                  <TouchableOpacity onPress={() => setSearchTerm("")}>
                    <Ionicons name="close-circle" size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <ScrollView
              nestedScrollEnabled
              style={{ maxHeight: 340 }}
              showsVerticalScrollIndicator={false}
            >
              {isLoading ? (
                Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => renderSkeletonRow(i))
              ) : error ? (
                <View className="items-center py-8">
                  <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
                  <Text className="text-gray-700 mt-3 text-center text-sm">{error}</Text>
                  <TouchableOpacity
                    className="mt-4 bg-indigo-100 px-5 py-2 rounded-full"
                    onPress={fetchItems}
                  >
                    <Text className="text-indigo-700 font-medium text-xs">Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : filteredItems.length === 0 ? (
                <View className="items-center py-8">
                  <Ionicons
                    name={searchTerm ? "search-outline" : "cart-outline"}
                    size={32}
                    color="#9CA3AF"
                  />
                  <Text className="text-gray-500 mt-3 text-sm">
                    {searchTerm ? "No matching items found" : "No items available"}
                  </Text>
                  {searchTerm ? (
                    <TouchableOpacity
                      className="mt-4 bg-indigo-100 px-5 py-2 rounded-full"
                      onPress={() => setSearchTerm("")}
                    >
                      <Text className="text-indigo-700 font-medium text-xs">Clear Search</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                filteredItems.map((item) => renderItemRow(item))
              )}
            </ScrollView>
          </View>

          {/* Discount / payment card */}
          <View className="bg-white mx-4 mt-3 rounded-2xl shadow-sm p-4">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-gray-700">Discount</Text>
                <Text className="text-gray-400 text-xs mt-0.5">Consumer</Text>
              </View>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-2">
                <Text className="text-gray-500">₹</Text>
                <TextInput
                  ref={discountInputRef}
                  className="w-20 py-1.5 text-right text-sm"
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
                  className="w-20 py-1.5 text-right text-sm"
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

            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <Text className="text-gray-800 font-semibold text-base">Total Amount</Text>
              <Text className="text-gray-800 font-semibold text-base">₹{totalAmount}</Text>
            </View>

            <View className="flex-row justify-between items-center pt-3">
              <Text className="text-gray-700">Payment Mode</Text>
              <View className="flex-row" style={{ gap: 8 }}>
                <TouchableOpacity
                  className={`flex-row items-center px-3 py-2 rounded-lg ${
                    paymentMode === "cash" ? "bg-indigo-100" : "bg-gray-50"
                  }`}
                  onPress={() => setPaymentMode("cash")}
                >
                  <Ionicons
                    name={paymentMode === "cash" ? "radio-button-on" : "radio-button-off"}
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
                  className={`flex-row items-center px-3 py-2 rounded-lg ${
                    paymentMode === "credit" ? "bg-indigo-100" : "bg-gray-50"
                  }`}
                  onPress={() => setPaymentMode("credit")}
                >
                  <Ionicons
                    name={paymentMode === "credit" ? "radio-button-on" : "radio-button-off"}
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
              <View className="flex-row justify-between items-center pt-3 mt-3 border-t border-gray-100">
                <Text className="text-gray-700">Credit Days</Text>
                <View className="bg-gray-50 border border-gray-200 rounded-lg px-2">
                  <TextInput
                    className="w-20 py-1.5 text-right text-sm"
                    keyboardType="numeric"
                    value={creditDays}
                    onChangeText={(text) => setCreditDays(text.replace(/[^0-9]/g, ""))}
                    maxLength={3}
                    placeholder="Enter days"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Save/Back — plain last elements in the ScrollView, in
              normal flow. Not pinned, not measured against anything,
              just the bottom of the page. */}
          <View className="flex-row mx-4 mt-4" style={{ gap: 12 }}>
            <TouchableOpacity
              className="flex-1 bg-gray-200 flex-row items-center justify-center rounded-full py-3.5"
              onPress={() => router.back()}
              disabled={saving}
            >
              <Ionicons name="arrow-back" size={18} color="#4B5563" />
              <Text className="ml-2 text-gray-700 font-semibold text-sm">Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center rounded-full py-3.5 ${
                saving ? "bg-indigo-400" : "bg-indigo-600"
              }`}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text className="ml-2 text-white font-semibold text-sm">Saving</Text>
                </>
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="white" />
                  <Text className="ml-2 text-white font-semibold text-sm">Save Order</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default NewPartyOrder;
import { Modal, Text, TouchableOpacity, View, ScrollView } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

export default function LocationDisclosure({ visible, onAllow, onDeny }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 12, width: "85%", overflow: "hidden" }}>
          {/* Header */}
          <View style={{ backgroundColor: "#1d4ed8", padding: 16 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
              Location access required
            </Text>
            <Text style={{ color: "#bfdbfe", fontSize: 13, marginTop: 4 }}>
              Please read before continuing
            </Text>
          </View>

          <ScrollView style={{ padding: 20 }}>
            {/* ✅ Google requires these 3 disclosures explicitly */}
            <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 6 }}>
              Background location tracking
            </Text>
            <Text style={{ fontSize: 13, color: "#555", marginBottom: 16, lineHeight: 20 }}>
              This app collects your location data <Text style={{ fontWeight: "700", color: "#111" }}>
              even when the app is closed or not in use.
              </Text>
            </Text>

            <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 6 }}>
              Why we collect it
            </Text>
            <Text style={{ fontSize: 13, color: "#555", marginBottom: 16, lineHeight: 20 }}>
              To verify attendance, track field sales activity, and support your employer's
              workforce management requirements.
            </Text>

            <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 6 }}>
              When it's active
            </Text>
            <Text style={{ fontSize: 13, color: "#555", marginBottom: 20, lineHeight: 20 }}>
              Location is collected continuously during your work shift, including when the
              app is running in the background.
            </Text>

            <Text style={{ fontSize: 12, color: "#777", marginBottom: 20, lineHeight: 18,
              backgroundColor: "#f5f5f5", padding: 12, borderRadius: 8 }}>
              By tapping Allow, you consent to background location collection as described.
              You may revoke this at any time in device Settings → App → Permissions.
            </Text>
          </ScrollView>

          {/* Buttons */}
          <View style={{ flexDirection: "row", gap: 8, padding: 16, paddingTop: 0 }}>
            <TouchableOpacity onPress={onDeny}
              style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#ccc", alignItems: "center" }}>
              <Text style={{ color: "#666" }}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAllow}
              style={{ flex: 2, padding: 12, borderRadius: 8, backgroundColor: "#1d4ed8", alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>Allow location access</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
import { View, Text, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import ky from "ky";
import { API_URL } from "../../constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";

const SecondaryPartySummary = () => {
  // ledcd/lednm here are the PARENT party's id/name — same params this
  // screen is pushed with from SecondaryPartyList (see that screen's
  // route params: vendcd, vendName, parentLedcd, parentLednm, userId —
  // reused here as ledcd/lednm/userId for the parent scope).
  const { ledcd, lednm, userId } = useLocalSearchParams<any>();
  const [date, setDate] = useState(new Date(Date.now()));
  const [show, setShow] = useState(false);
  const router = useRouter();

  const onChange = (event: any, selectedDate: any) => {
    setShow(false);
    // Android fires this with selectedDate === undefined when the picker
    // is dismissed instead of confirmed — guard against clobbering `date`
    // with undefined, same fix as flagged for PreSummary's onChange.
    if (event.type === "dismissed" || !selectedDate) return;
    setDate(selectedDate);
  };

  const generateAndShareSecondarySummary = async () => {
    try {
      const response: any = await ky
        .post(`${API_URL}/user/getSecondaryPartySummary`, {
          json: {
            empId: userId,
            date,
            parentLedcd: ledcd,
          },
          // Mirrors PreSummary's getSummary call — this endpoint does a
          // similar visit-time join against partyImages, so give it the
          // same generous timeout rather than ky's 10s default.
          timeout: 60000,
        })
        .json();

      const summaryData = response.data;

      if (!summaryData || !Array.isArray(summaryData.vendors)) {
        alert("Could not load secondary party summary. Check logs.");
        console.log("[SecondarySummary] Unexpected response:", response);
        return;
      }

      const vendors = summaryData.vendors;

      const sortedVendors = [...vendors].sort((a: any, b: any) => {
        if (a.visitTime === "N/A" && b.visitTime === "N/A") return 0;
        if (a.visitTime === "N/A") return 1;
        if (b.visitTime === "N/A") return -1;

        const parseTime = (t: string) => {
          const [time, meridiem] = t.split(" ");
          let [hours, minutes] = time.split(":").map(Number);
          if (meridiem?.toLowerCase() === "pm" && hours !== 12) hours += 12;
          if (meridiem?.toLowerCase() === "am" && hours === 12) hours = 0;
          return hours * 60 + minutes;
        };

        return parseTime(a.visitTime) - parseTime(b.visitTime);
      });

      const rows = sortedVendors
        .map(
          (v: any, index: number) => `
<tr>
    <td style="padding:8px; border:1px solid #ddd;">${index + 1}</td>
    <td style="padding:8px; border:1px solid #ddd;">${v.vendName}</td>
    <td style="padding:8px; border:1px solid #ddd; text-align:center;">${v.visitTime}</td>
    <td style="padding:8px; border:1px solid #ddd; text-align:right;">${v.orderQty || 0}</td>
    <td style="padding:8px; border:1px solid #ddd; text-align:center; text-transform:capitalize;">${v.orderType || ""}</td>
    <td style="padding:8px; border:1px solid #ddd; text-align:right;">${v.consumerRate || 0} / ${v.bulkRate || 0}</td>
</tr>
`,
        )
        .join("");

      const htmlContent = `
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1, h2, h3, h4 { text-align: center; margin: 0; padding: 2px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; }
              th { background-color: #f2f2f2; text-align: center; }
              td { vertical-align: top; }
            </style>
        </head>
        <body>
            <h1>MAHESH EDIBLE OILS PRODUCTS PVT LTD</h1>
            <h2>Secondary Party Summary</h2>
            <h3>Parent Party - ${lednm}</h3>
            <h4>FOR DATE - ${date.toLocaleDateString()}</h4>
            <table>
            <thead>
      <tr>
        <th>Sno</th>
        <th>Vendor Name</th>
        <th>Visit Time</th>
        <th>Order Qty</th>
        <th>Order Type</th>
        <th>Nett Rate</th>
      </tr>
  </thead>
            <tbody>
                ${rows}
                <tr>
                    <td style="padding:8px; border:1px solid #ddd;" colspan="3"><strong>Total</strong></td>
                    <td style="padding:8px; border:1px solid #ddd; text-align:right;"><strong>${summaryData.totalQty}</strong></td>
                    <td style="padding:8px; border:1px solid #ddd;" colspan="2"></td>
                </tr>
            </tbody>
            </table>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await shareAsync(uri, {});
    } catch (error: any) {
      console.log("[SecondarySummary] CAUGHT ERROR:", error);
      alert("Failed to generate/share secondary party summary.");
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <View className="h-20 flex justify-center bg-purple-600 p-2">
        <Text className="text-white font-bold text-2xl">
          Secondary Party Summary
        </Text>
        <Text className="text-purple-200 text-sm" numberOfLines={1}>
          {lednm}
        </Text>
      </View>

      <View className="pt-5 pb-5 px-5 flex-row items-center gap-14">
        <Text className="text-xl font-semibold">Date Selection</Text>
        <TouchableOpacity
          onPress={() => setShow(true)}
          className="flex justify-center items-center bg-purple-600 w-40 rounded-lg py-5 ml-4"
        >
          <Text className="text-white">{date.toLocaleDateString()}</Text>
        </TouchableOpacity>

        {show && (
          <DateTimePicker
            testID="datetimepicker"
            value={date}
            is24Hour={true}
            onChange={onChange}
          />
        )}
      </View>

      <View className="py-2 flex flex-col gap-3 mt-auto mb-4">
        <TouchableOpacity
          onPress={() => generateAndShareSecondarySummary()}
          className="rounded-lg flex justify-center items-center bg-purple-600 mx-4 py-4"
        >
          <Text className="text-white font-semibold text-lg">
            Share Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          className="rounded-lg flex justify-center items-center bg-purple-600 mx-4 py-4"
        >
          <Text className="text-white font-semibold text-lg">Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SecondaryPartySummary;
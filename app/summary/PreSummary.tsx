import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import ky from "ky";
import { API_URL } from "../../constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";

interface apidata {
  collectionCash: number;
  beatsOrdered: number;
  collectionCheque: number;
  collectionOnline: number;
  totalQuantity: number;
  attendanceTime: string;
  beatsVisited: string;
  totalBeats: string;
}

const PreSummary = () => {
  const { userId, username } = useLocalSearchParams();
  const [date, setDate] = useState(new Date(Date.now()));
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<apidata | null>(null);
  const router = useRouter();

  const onChange = (event: any, selectedDate: any) => {
    setDate(selectedDate);
    setShow(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response: any = await ky
          .post(`${API_URL}/user/getPreSummary`, {
            json: { username: userId, date },
          })
          .json();

        setData(response.data);
      } catch (err) {
        console.log("err: ", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date]);

  const generateAndSharePDF = async () => {
    console.log("[SharePDF] Step 0: button pressed, starting");

    try {
      const partyMap: Record<string, any> = {};

      console.log("[SharePDF] Step 1: calling getSummary with", {
        username: userId,
        date,
      });

      const response: any = await ky
        .post(`${API_URL}/user/getSummary`, {
          json: {
            username: userId,
            date: date,
          },
          // getSummary does several sequential per-row lookups against the
          // mstparty view (see backend), which can comfortably exceed ky's
          // default 10s timeout for a busy day. This is a stopgap — the
          // real fix is batching those lookups server-side.
          timeout: 60000,
        })
        .json();

      console.log("[SharePDF] Step 1 done: raw response", response);

      const summaryData = response.data;

      console.log("[SharePDF] Step 2: summaryData =", summaryData);

      if (!summaryData) {
        console.log(
          "[SharePDF] ABORT: summaryData is falsy — getSummary likely returned an error or empty data field",
        );
        alert("Could not load summary data (empty response). Check logs.");
        return;
      }

      console.log(
        "[SharePDF] Step 2a: summaryData.parties =",
        summaryData.parties,
      );
      console.log(
        "[SharePDF] Step 2b: summaryData.collection =",
        summaryData.collection,
      );
      console.log("[SharePDF] Step 2c: summaryData.order =", summaryData.order);
      console.log(
        "[SharePDF] Step 2d: summaryData.partyVisitTimeMap =",
        summaryData.partyVisitTimeMap,
      );

      if (!summaryData.partyVisitTimeMap) {
        console.log(
          "[SharePDF] WARNING: summaryData.partyVisitTimeMap is undefined. " +
            "getSummary's response does not include this key (order/collection/stock/parties/total/startTime/endTime only). " +
            "Every access below of the form summaryData.partyVisitTimeMap[...] will throw. " +
            "Falling back to an empty object so the rest of the flow can be diagnosed, " +
            "but this means visitTime will show as 'N/A' for every party until the backend/response is fixed.",
        );
      }
      const partyVisitTimeMap = summaryData.partyVisitTimeMap || {};

      if (!Array.isArray(summaryData.parties)) {
        console.log(
          "[SharePDF] ABORT: summaryData.parties is not an array:",
          summaryData.parties,
        );
        alert("Summary data is missing 'parties'. Check logs.");
        return;
      }

      // 1. Pre-populate partyMap from parties list
      console.log("[SharePDF] Step 3: pre-populating partyMap from parties");
      summaryData.parties.forEach((item: any) => {
        partyMap[item.ledcd] = {
          partyName: item.lednm,
          mobile: item.mobile,
          outstanding: Number(item.outs ?? 0),
          billDate: item.billdt ?? "",
          orderQty: 0,
          consumerRate: 0,
          bulkRate: 0,
          orderType: "",
          collCash: 0,
          collOnline: 0,
          visitTime: partyVisitTimeMap[item.ledcd] ?? "N/A",
        };
      });
      console.log(
        "[SharePDF] Step 3 done: partyMap keys after parties =",
        Object.keys(partyMap),
      );

      if (!Array.isArray(summaryData.collection)) {
        console.log(
          "[SharePDF] ABORT: summaryData.collection is not an array:",
          summaryData.collection,
        );
        alert("Summary data is missing 'collection'. Check logs.");
        return;
      }

      // 2. Merge collection data
      console.log("[SharePDF] Step 4: merging collection data");
      summaryData.collection.forEach((item: any) => {
        const amount = Number(item.amount ?? 0);
        const method = item.paymentMethod;

        if (!partyMap[item.partyId]) {
          partyMap[item.partyId] = {
            partyName: item.partyName,
            mobile: "",
            outstanding: 0,
            billDate: "N/A",
            orderQty: 0,
            consumerRate: 0,
            bulkRate: 0,
            orderType: "",
            collCash: 0,
            collOnline: 0,
            visitTime: partyVisitTimeMap[item.partyId] ?? "N/A",
          };
        }

        if (method === "cash") {
          partyMap[item.partyId].collCash =
            (partyMap[item.partyId].collCash || 0) + amount;
        } else if (method === "cheque" || method === "online") {
          partyMap[item.partyId].collOnline =
            (partyMap[item.partyId].collOnline || 0) + amount;
        }
      });
      console.log(
        "[SharePDF] Step 4 done: partyMap keys after collection =",
        Object.keys(partyMap),
      );

      if (!Array.isArray(summaryData.order)) {
        console.log(
          "[SharePDF] ABORT: summaryData.order is not an array:",
          summaryData.order,
        );
        alert("Summary data is missing 'order'. Check logs.");
        return;
      }

      // 3. Merge order data
      console.log("[SharePDF] Step 5: merging order data");
      summaryData.order.forEach((item: any) => {
        if (!partyMap[item.partyId]) {
          partyMap[item.partyId] = {
            partyName: item.partyName,
            mobile: "",
            outstanding: 0,
            billDate: "N/A",
            consumerRate: item.consumerRate,
            bulkRate: item.bulkRate,
            orderQty: Number(item.totalAmount ?? 0),
            orderType: item.paymentMode || "",
            collCash: 0,
            collOnline: 0,
            visitTime: partyVisitTimeMap[item.partyId] ?? "N/A",
          };
        } else {
          partyMap[item.partyId].consumerRate = item.consumerRate;
          partyMap[item.partyId].bulkRate = item.bulkRate;
          partyMap[item.partyId].orderQty =
            (partyMap[item.partyId].orderQty || 0) +
            Number(item.totalAmount ?? 0);
          partyMap[item.partyId].orderType = item.paymentMode || "";
        }
      });
      console.log(
        "[SharePDF] Step 5 done: partyMap keys after order =",
        Object.keys(partyMap),
      );
      console.log(
        "[SharePDF] Step 5b: final partyMap =",
        JSON.stringify(partyMap, null, 2),
      );

      const totalCash = Object.values(partyMap).reduce(
        (sum: number, p: any) => sum + (p.collCash || 0),
        0,
      );
      const totalOnline = Object.values(partyMap).reduce(
        (sum: number, p: any) => sum + (p.collOnline || 0),
        0,
      );

      console.log("[SharePDF] Step 6: totals =", { totalCash, totalOnline });

      const rows = Object.values(partyMap)
        .sort((a: any, b: any) => {
          // N/A always goes to the bottom
          if (a.visitTime === "N/A" && b.visitTime === "N/A") return 0;
          if (a.visitTime === "N/A") return 1;
          if (b.visitTime === "N/A") return -1;

          // Parse "12:54 pm" / "01:14 pm" style times for comparison
          const parseTime = (t: string) => {
            const [time, meridiem] = t.split(" ");
            let [hours, minutes] = time.split(":").map(Number);
            if (meridiem?.toLowerCase() === "pm" && hours !== 12) hours += 12;
            if (meridiem?.toLowerCase() === "am" && hours === 12) hours = 0;
            return hours * 60 + minutes;
          };

          return parseTime(a.visitTime) - parseTime(b.visitTime);
        })
        .map(
          (p: any, index) => `
<tr>
    <td style="padding:8px; border:1px solid #ddd;">${index + 1}</td>
    <td style="padding:8px; border:1px solid #ddd;">${p.partyName}${p.mobile ? " (" + p.mobile + ")" : ""}</td>
    <td style="padding:8px; border:1px solid #ddd; text-align:center;">${p.visitTime}</td>
    <td style="padding:8px; border:1px solid #ddd; text-align:right;">${p.orderQty || 0}</td>
    <td style="padding:8px; border:1px solid #ddd; text-align:center; text-transform:capitalize;">${p.orderType || ""}</td>
    <td style="padding:8px; border:1px solid #ddd; text-align:right;">${p.consumerRate || 0} / ${p.bulkRate || 0}</td>
    <td style="padding:8px; border:1px solid #ddd; text-align:right;">${p.collCash ? "₹" + p.collCash : "-"}</td>
    <td style="padding:8px; border:1px solid #ddd; text-align:right;">${p.collOnline ? "₹" + p.collOnline : "-"}</td>
    <td style="padding:8px; border:1px solid #ddd; text-align:right;">
₹${p.outstanding || 0}
${p.billDate && p.billDate !== "N/A" ? `<br/><span style="font-size:11px; color:#666;">${p.billDate}</span>` : ""}
</td>
</tr>
`,
        )
        .join("");

      console.log("[SharePDF] Step 7: rows HTML built, length =", rows.length);

      const htmlContent = `
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1, h2, h3, h4 { text-align: center; margin: 0; padding: 2px 0; }
              .timing { text-align: center; margin-top: 8px; font-size: 14px; color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; }
              th { background-color: #f2f2f2; text-align: center; }
              td { vertical-align: top; }
            </style>
        </head>
        <body>
            <h1>MAHESH EDIBLE OILS PRODUCTS PVT LTD</h1>
            <h2>Daily Working Report</h2>
            <h3>Employee Name - ${username}</h3>
            <h4>FOR DATE - ${date.toLocaleDateString()}</h4>
            <p class="timing">
              <strong>Start Time:</strong> ${summaryData.startTime}
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <strong>End Time:</strong> ${summaryData.endTime}
            </p>
            <table>
            <thead>
      <tr>
        <th>Sno</th>
        <th>Party Name</th>
        <th>Visit Time</th>
        <th>Order Qty</th>
        <th>Order Type</th>
        <th>Nett Rate</th>
        <th>Cash</th>
        <th>Online / Cheque</th>
        <th>Outstanding 
            Last Bill Date
        </th>
      </tr>
  </thead>
            <tbody>
                ${rows}
                <tr>
                    <td style="padding:8px; border:1px solid #ddd;" colspan="4"><strong>Total</strong></td>
                    <td style="padding:8px; border:1px solid #ddd; text-align:right;"><strong>${summaryData.total.totalQty}</strong></td>
                    <td style="padding:8px; border:1px solid #ddd;"></td>
                    <td style="padding:8px; border:1px solid #ddd; text-align:right;"><strong>₹${totalCash}</strong></td>
                    <td style="padding:8px; border:1px solid #ddd; text-align:right;"><strong>₹${totalOnline}</strong></td>
                    <td style="padding:8px; border:1px solid #ddd; text-align:right;"><strong>₹${summaryData.total.outstanding}</strong></td>
                </tr>
            </tbody>
            </table>
        </body>
        </html>
      `;

      console.log("[SharePDF] Step 8: calling Print.printToFileAsync");

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      console.log("[SharePDF] Step 8 done: PDF written to", uri);

      console.log("[SharePDF] Step 9: calling shareAsync");

      await shareAsync(uri, {});

      console.log("[SharePDF] Step 9 done: share sheet completed/dismissed");
    } catch (error: any) {
      console.log("[SharePDF] CAUGHT ERROR:", error);
      console.log("[SharePDF] Error message:", error?.message);
      console.log("[SharePDF] Error stack:", error?.stack);
      // If it's an HTTP error from ky, try to surface the response body too
      if (error?.response) {
        try {
          const body = await error.response.text();
          console.log("[SharePDF] Error response body:", body);
        } catch (readErr) {
          console.log("[SharePDF] Could not read error response body:", readErr);
        }
      }
      alert(
        "Failed to generate/share summary. Check console logs for details.",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1">
      {/* Header */}
      <View className="h-20 flex justify-center bg-blue-600 p-2">
        <Text className="text-white font-bold text-2xl">Summary</Text>
      </View>

      {/* Date Picker */}
      <View className="pt-5 pb-5 px-5 flex-row items-center gap-14">
        <Text className="text-xl font-semibold">Date Selection</Text>
        <TouchableOpacity
          onPress={() => setShow(true)}
          className="flex justify-center items-center bg-blue-600 w-40 rounded-lg py-5 ml-4"
        >
          <Text className="text-white font-GeistRegular">
            {date.toLocaleDateString()}
          </Text>
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

      {loading === true && data === null ? (
        <View className="flex-1 flex justify-center items-center">
          <ActivityIndicator size={40} />
        </View>
      ) : (
        <View className="flex-1 mt-4">
          {/* Attendance */}
          <View className="flex flex-col gap-2">
            <View className="flex px-4 py-4">
              <Text className="text-xl font-medium">
                Attendance Time: {data?.attendanceTime}
              </Text>
            </View>
          </View>

          {/* Order Summary */}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/summary/Summary",
                params: {
                  mode: "Order",
                  date: date.toString(),
                  userId,
                },
              })
            }
          >
            <View className="bg-gray-200">
              <View className="pt-4 px-0">
                <Text className="text-xl ml-4 font-medium">Order Summary</Text>
              </View>
              <View className="pb-10 pt-5 px-4">
                <View className="flex-row items-center gap-5">
                  <Text className="text-lg">Beats Ordered:</Text>
                  <Text className="text-lg">{data?.beatsOrdered}</Text>
                </View>
                <View className="flex-row items-center gap-5">
                  <Text className="text-lg">Total Quantity:</Text>
                  <Text className="text-lg">{data?.totalQuantity}</Text>
                </View>
                <View className="flex-row items-center gap-5">
                  <Text className="text-lg">Total Beats:</Text>
                  <Text className="text-lg">{data?.totalBeats}</Text>
                </View>
                <View className="flex-row items-center gap-5">
                  <Text className="text-lg">Beats Visited:</Text>
                  <Text className="text-lg">{data?.beatsVisited}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Collection Summary */}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/summary/Summary",
                params: {
                  mode: "Collection",
                  date: date.toString(),
                  userId,
                },
              })
            }
          >
            <View className="bg-gray-200 mt-10">
              <View className="pt-4 px-0">
                <Text className="text-xl ml-4 font-medium">
                  Collection Summary
                </Text>
              </View>
              <View className="pb-10 pt-5 px-4">
                <View className="flex-row items-center gap-5">
                  <Text className="text-lg">Collection Cash:</Text>
                  <Text className="text-lg">{data?.collectionCash}</Text>
                </View>
                <View className="flex-row items-center gap-5">
                  <Text className="text-lg">Collection UPI:</Text>
                  <Text className="text-lg">{data?.collectionOnline}</Text>
                </View>
                <View className="flex-row items-center gap-5">
                  <Text className="text-lg">Collection Cheque:</Text>
                  <Text className="text-lg">{data?.collectionCheque}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View className="py-2 flex flex-col gap-3">
            <TouchableOpacity
              onPress={() => generateAndSharePDF()}
              className="rounded-lg flex justify-center items-center bg-blue-600 mx-4 py-4"
            >
              <Text className="text-white font-semibold text-lg">
                Share Summary
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-lg flex justify-center items-center bg-blue-600 mx-4 py-4"
            >
              <Text className="text-white font-semibold text-lg">
                Back to Beats
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PreSummary;
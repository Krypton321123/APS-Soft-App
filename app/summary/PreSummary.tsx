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
    const partyMap: Record<string, any> = {};

    const response: any = await ky
      .post(`${API_URL}/user/getSummary`, {
        json: {
          username: userId,
          date: date,
        },
      })
      .json();

    const summaryData = response.data;

    console.log("received data", summaryData);

    // 1. Pre-populate partyMap from parties list
    summaryData.parties.forEach((item: any) => {
      partyMap[item.ledcd] = {
        partyName: item.lednm,
        mobile: item.mobile,
        outstanding: Number(item.outs ?? 0),
        orderQty: 0,
        consumerRate: 0,
        bulkRate: 0,
        collCash: 0,
        collOnline: 0,
      };
    });

    // 2. Merge collection data
    summaryData.collection.forEach((item: any) => {
      const amount = Number(item.amount ?? 0);
      const method = item.paymentMethod; // "cash", "cheque", or "online"

      if (!partyMap[item.partyId]) {
        partyMap[item.partyId] = {
          partyName: item.partyName,
          mobile: "",
          outstanding: 0,
          orderQty: 0,
          consumerRate: 0,
          bulkRate: 0,
          collCash: 0,
          collOnline: 0,
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

    // 3. Merge order data — FIX: always set consumerRate, bulkRate, and orderQty
    //    regardless of whether the party already exists in partyMap
    summaryData.order.forEach((item: any) => {
      console.log("order partyId:", JSON.stringify(item.partyId));
      console.log("exists in map:", !!partyMap[item.partyId]);
      console.log(
        "consumerRate:",
        item.consumerRate,
        "bulkRate:",
        item.bulkRate,
        "totalAmount:",
        item.totalAmount,
      );
      if (!partyMap[item.partyId]) {
        partyMap[item.partyId] = {
          partyName: item.partyName,
          mobile: "",
          outstanding: 0,
          consumerRate: item.consumerRate,
          bulkRate: item.bulkRate,
          orderQty: Number(item.totalAmount ?? 0),
          collCash: 0,
          collOnline: 0,
        };
      } else {
        // FIX: was missing consumerRate and bulkRate in the else branch
        partyMap[item.partyId].consumerRate = item.consumerRate;
        partyMap[item.partyId].bulkRate = item.bulkRate;
        partyMap[item.partyId].orderQty =
          (partyMap[item.partyId].orderQty || 0) +
          Number(item.totalAmount ?? 0);
      }
    });
    console.log("party keys:", Object.keys(partyMap));

    const totalCash = Object.values(partyMap).reduce(
      (sum: number, p: any) => sum + (p.collCash || 0),
      0,
    );
    const totalOnline = Object.values(partyMap).reduce(
      (sum: number, p: any) => sum + (p.collOnline || 0),
      0,
    );

    const rows = Object.values(partyMap)
      .map(
        (p: any, index) => `
    <tr>
        <td style="padding:8px; border:1px solid #ddd;">${index + 1}</td>
        <td style="padding:8px; border:1px solid #ddd;">${p.partyName}${p.mobile ? " (" + p.mobile + ")" : ""}</td>
        <td style="padding:8px; border:1px solid #ddd; text-align:right;">${p.orderQty || 0}</td>
        <td style="padding:8px; border:1px solid #ddd; text-align:right;">${p.consumerRate || 0} / ${p.bulkRate || 0}</td>
        <td style="padding:8px; border:1px solid #ddd; text-align:right;">${p.collCash ? "₹" + p.collCash : "-"}</td>
        <td style="padding:8px; border:1px solid #ddd; text-align:right;">${p.collOnline ? "₹" + p.collOnline : "-"}</td>
        <td style="padding:8px; border:1px solid #ddd; text-align:right;">₹${p.outstanding || 0}</td>
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
                    h1, h2, h3, h4 { text-align: center; margin: 0; padding: 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; }
                    th { background-color: #f2f2f2; }
                    td { vertical-align: top; }
                    </style>
                </head>
                <body>
                    <h1>MAHESH EDIBLE OILS PRODUCTS PVT LTD</h1>
                    <h2>Daily Working Report</h2>
                    <h3>Employee Name - ${username}</h3>
                    <h4>FOR DATE - ${date} </h4>
                    <table>
                    <thead>
                        <tr>
                        <th>Sno</th>
                        <th>Party Name</th>
                        <th>Order Qty</th>
                        <th>Nett Rate</th>
                        <th>Cash</th>
                        <th>Online / Cheque</th>
                        <th>Outstanding</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                        <tr>
                            <td style="padding:8px; border:1px solid #ddd;" colspan="2"><strong>Total</strong></td>
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

    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    await shareAsync(uri, {});
  };

  return (
    <SafeAreaView className="flex-1">
      <View className="h-20 flex justify-center bg-blue-600 p-2">
        <Text className="text-white font-bold text-2xl">Summary</Text>
      </View>
      <View className="pt-5 pb-5 px-5 flex-row items-center gap-14">
        <Text className="text-xl font-semibold">Date Selection</Text>
        <TouchableOpacity
          onPress={() => setShow(true)}
          className=" flex justify-center items-center bg-blue-600 w-40 rounded-lg py-5 ml-4"
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
          <View className="flex flex-col gap-2">
            <View className="flex px-4 py-4">
              <Text className="text-xl font-medium">
                Attendance Time: {data?.attendanceTime}
              </Text>
            </View>
          </View>

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

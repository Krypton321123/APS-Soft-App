import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import { API_URL } from '@/constants'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const LOCATION_TASK_NAME = "background-location-task"

TaskManager.defineTask(LOCATION_TASK_NAME, async ({data: { locations }, error}: {data: {locations: Location.LocationObject[]}, error: any}) => {
    if (error) {
        return console.error("location task error: ", error)
    }

    if (locations && locations.length > 0) {
        try {

            const latitude = locations[0].coords.latitude; 
            const longitude = locations[0].coords.longitude;

            const userId = await AsyncStorage.getItem('userId')

            console.log("here is the user id: ", userId)

            const date = new Date(Date.now()).toLocaleDateString('en-IN', {
                day: '2-digit', 
                month: '2-digit', 
                year: '2-digit'
            })

            if (!userId) {
                return console.error("user name not found!"); 
            }

            const response = await fetch(`${API_URL}/location/post`, {body: JSON.stringify({
                empId: userId, location: {latitude, longitude}, date
            }), method: "POST", headers: { "Content-Type": "application/json" }})
            
            if (response.ok) {
                const result = await response.json(); 
                console.log("The data is: ", result); 
            } else {
                console.log("post location error!")!
            }
            

        } catch (err) {
            return console.error("Error posting location to server: ", err)
        }
    } 
})
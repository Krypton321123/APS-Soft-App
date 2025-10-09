import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { LOCATION_TASK_NAME } from '@/tasks/locationTask'

export async function startTracking() {
    const { status: fg } = await Location.requestForegroundPermissionsAsync()
    if (fg !== 'granted') {
        console.error("Location permission denied!"); 
    }
    const {status: bg} = await Location.requestBackgroundPermissionsAsync(); 
    if (bg !== 'granted') {
        console.error("Background location permission denied"); 
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Highest,
    timeInterval: 0,
    distanceInterval: 10,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Tracking active",
      notificationBody: "We are tracking your location",
    },
  });

  console.log("started tracking")

}

export async function stopTracking() {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)
    if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
        console.log("stopped tracking")
    }
}

export async function isTracking() {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME); 
    if (isTracking) {
        return true
    } else {
        return false; 
    }
}
import { defineStore } from 'pinia';
import apiService from '@/services/apiService';
import { useCameraStore } from '@/store/cameraStore';
import { useSettingsStore } from '@/store/settingsStore';

export const apiStore = defineStore('store', {
  state: () => ({
    intervalId: null,
    intervalIdGraph: null,
    profileInfo: [],
    sequenceInfo: [],
    collapsedStates: {},
    cameraInfo: { IsExposing: false },
    mountInfo: [],
    filterInfo: [],
    focuserInfo: [],
    rotatorInfo: [],
    focuserAfInfo: [],
    guiderInfo: [],
    guiderChartInfo: [],
    flatdeviceInfo: [],
    domeInfo: [],
    safetyInfo: {
      Connected: false,
      IsSafe: false,
    },
    switchInfo: [],
    weatherInfo: [],
    RADistanceRaw: [],
    DECDistanceRaw: [],
    isBackendReachable: false,
    filterName: 'unbekannt',
    filterNr: null,
    showAfGraph: true,
    imageData: null,
    isLoadingImage: false,
    captureRunning: false,
    rotatorMechanicalPosition: 0,
    sequenceIsLoaded: false,
    sequenceRunning: false,
    existingEquipmentList: [],
    coordinates: null,
    currentLanguage: 'en',
    showSettings: false,
    minimumApiVersion: '2.1.7.0',
    currentApiVersion: null,
    isVersionNewerOrEqual: false,
    mount: {
      currentTab: 'showMount',
    },
  }),

  actions: {
    setSequenceRunning(isRunning) {
      this.sequenceRunning = isRunning;
    },
    toggleCollapsedState(containerName) {
      this.collapsedStates = {
        ...this.collapsedStates,
        [containerName]: !this.collapsedStates[containerName],
      };
    },

    isCollapsed(containerName) {
      return !!this.collapsedStates[containerName];
    },

    async getGuiderInfo() {
      try {
        const response = await apiService.guiderAction('info');
        if (response.Success) {
          this.guiderInfo = response.Response;
        }
      } catch (error) {
        console.error('Error fetching guider info:', error);
      }
    },

    async getGuiderChartInfo() {
      try {
        const response = await apiService.guiderAction('graph');
        if (response.Success) {
          this.guiderChartInfo = response.Response;
        }
      } catch (error) {
        console.error('Error fetching guider chart info:', error);
      }
    },

    async fetchAllInfos() {
      try {
        const versionResponse = await apiService.isBackendReachable();
        this.isBackendReachable = !!versionResponse;

        if (this.isBackendReachable) {
          this.currentApiVersion = versionResponse.Response;
          this.isVersionNewerOrEqual = this.checkVersionNewerOrEqual(
            this.currentApiVersion,
            this.minimumApiVersion
          );

          if (!this.isVersionNewerOrEqual) {
            console.warn('API version incompatible');
            this.clearAllStates();
            return;
          }
        } else {
          console.warn('Backend is not reachable');
          this.clearAllStates();
          return;
        }

        const [
          imageHistoryResponse,
          sequenceResponse,
          cameraResponse,
          mountResponse,
          filterResponse,
          rotatorResponse,
          focuserResponse,
          focuserAfResponse,
          guiderResponse,
          flatdeviceResponse,
          domeResponse,
          guiderChartResponse,
          safetyResponse,
          weatherResponse,
          switchResponse,
        ] = await Promise.all([
          apiService.imageHistoryAll(),
          apiService.sequenceAction('json'),
          apiService.cameraAction('info'),
          apiService.mountAction('info'),
          apiService.filterAction('info'),
          apiService.rotatorAction('info'),
          apiService.focusAction('info'),
          apiService.focuserAfAction('info'),
          apiService.guiderAction('info'),
          apiService.flatdeviceAction('info'),
          apiService.domeAction('info'),
          apiService.guiderAction('graph'),
          apiService.safetyAction('info'),
          apiService.weatherAction('info'),
          apiService.switchAction('info'),
        ]);

        this.handleApiResponses({
          imageHistoryResponse,
          sequenceResponse,
          cameraResponse,
          mountResponse,
          filterResponse,
          rotatorResponse,
          focuserResponse,
          focuserAfResponse,
          guiderResponse,
          flatdeviceResponse,
          domeResponse,
          guiderChartResponse,
          safetyResponse,
          weatherResponse,
          switchResponse,
          //logsResponse,
        });
      } catch (error) {
        console.error('Fehler beim Abrufen der Informationen:', error);
      }
      await this.fetchProfilInfos();
    },

    clearAllStates() {
      this.intervalId = null;
      this.intervalIdGraph = null;
      this.profileInfo = [];
      this.sequenceInfo = [];
      this.collapsedStates = {};
      this.cameraInfo = { IsExposing: false };
      this.mountInfo = [];
      this.filterInfo = [];
      this.focuserInfo = [];
      this.rotatorInfo = [];
      this.focuserAfInfo = [];
      this.guiderInfo = [];
      this.flatdeviceInfo = [];
      this.domeInfo = [];
      this.safetyInfo = {
        Connected: false,
        IsSafe: false,
      };
      this.switchInfo = [];
      this.weatherInfo = [];
      this.RADistanceRaw = [];
      this.DECDistanceRaw = [];
      this.isBackendReachable = false;
      this.filterName = 'unbekannt';
      this.filterNr = null;
      this.showAfGraph = true;
      this.imageData = null;
      this.isLoadingImage = false;
      this.captureRunning = false;
      this.rotatorMechanicalPosition = 0;
      this.sequenceIsLoaded = false;
      this.sequenceRunning = false;
      this.existingEquipmentList = [];
      this.coordinates = null;
      this.currentLanguage = 'en';
    },

    handleApiResponses({
      imageHistoryResponse,
      sequenceResponse,
      cameraResponse,
      mountResponse,
      filterResponse,
      rotatorResponse,
      focuserResponse,
      focuserAfResponse,
      guiderResponse,
      flatdeviceResponse,
      domeResponse,
      guiderChartResponse,
      safetyResponse,
      weatherResponse,
      switchResponse,
    }) {
      if (imageHistoryResponse.Success) {
        this.imageHistoryInfo = imageHistoryResponse.Response;
      } else {
        this.sequenceIsLoaded = false;
        console.error('Fehler in der Sequence-API-Antwort:', sequenceResponse.Error);
      }

      if (sequenceResponse.Success) {
        this.sequenceInfo = sequenceResponse.Response;
        this.sequenceIsLoaded = true;
        // Check if sequence is running
        // Check if any sequence is running by searching for RUNNING status
        const isRunning = sequenceResponse.Response?.some((sequence) =>
          sequence.Items?.some((item) => item.Status === 'RUNNING')
        );
        this.sequenceRunning = isRunning || false;
      } else {
        this.sequenceIsLoaded = false;
        this.sequenceRunning = false;
      }

      if (cameraResponse.Success) {
        this.cameraInfo = cameraResponse.Response;
      } else {
        console.error('Fehler in der Kamera-API-Antwort:', cameraResponse.Error);
      }

      if (mountResponse.Success) {
        this.mountInfo = mountResponse.Response;
      } else {
        console.error('Fehler in der Mount-API-Antwort:', mountResponse.Error);
      }

      if (filterResponse.Success) {
        this.filterInfo = filterResponse.Response;
      } else {
        console.error('Fehler in der Filter-API-Antwort:', filterResponse.Error);
      }

      if (rotatorResponse.Success) {
        this.rotatorInfo = rotatorResponse.Response;
      } else {
        console.error('Fehler in der Rotator-API-Antwort:', rotatorResponse.Error);
      }

      if (focuserResponse.Success) {
        this.focuserInfo = focuserResponse.Response;
      } else {
        console.error('Fehler in der Focuser-API-Antwort:', focuserResponse.Error);
      }

      if (focuserAfResponse.Success) {
        this.focuserAfInfo = focuserAfResponse;
      } else {
        console.error('Fehler in der Focuser-AF-API-Antwort:', focuserAfResponse.Error);
      }

      if (safetyResponse.Success) {
        this.safetyInfo = safetyResponse.Response;
      } else {
        console.error('Fehler in der Safety-API-Antwort:', safetyResponse.Error);
      }

      if (guiderResponse.Success) {
        this.guiderInfo = guiderResponse.Response;
      } else {
        console.error('Fehler in der Guider-API-Antwort:', guiderResponse.Error);
      }

      if (flatdeviceResponse.Success) {
        this.flatdeviceInfo = flatdeviceResponse.Response;
      } else {
        console.error('Fehler in der Flat-API-Antwort:', flatdeviceResponse.Error);
      }

      if (domeResponse.Success) {
        this.domeInfo = domeResponse.Response;
      } else {
        console.error('Fehler in der Flat-API-Antwort:', domeResponse.Error);
      }

      if (guiderChartResponse.Success) {
        this.processGuiderChartDataApi(guiderChartResponse.Response);
        this.guiderChartInfo = guiderChartResponse.Response;
      } else {
        console.error('Fehler in der Guider-Chart-API-Antwort:', guiderChartResponse);
      }

      if (weatherResponse.Success) {
        this.weatherInfo = weatherResponse.Response;
      } else {
        console.error('Fehler in der Weather-API-Antwort:', weatherResponse.Error);
      }

      if (switchResponse.Success) {
        this.switchInfo = switchResponse.Response;
      } else {
        console.error('Fehler in der Switch-API-Antwort:', switchResponse.Error);
      }
    },

    processGuiderChartDataApi(data) {
      // Überprüfen, ob das GuideSteps-Array vorhanden ist
      if (!Array.isArray(data?.GuideSteps)) {
        console.warn('Invalid GuideSteps, initializing as an empty array.');
        this.RADistanceRaw = [];
        this.DECDistanceRaw = [];
        return;
      }
      // Extrahieren der RADistanceRawDisplay und DECDistanceRawDisplay Werte
      this.RADistanceRaw = data.GuideSteps.map((step) =>
        typeof step.RADistanceRaw === 'number' ? step.RADistanceRawDisplay : 0
      );

      this.DECDistanceRaw = data.GuideSteps.map((step) =>
        typeof step.DECDistanceRaw === 'number' ? step.DECDistanceRawDisplay : 0
      );
    },

    startFetchingInfo() {
      if (!this.intervalId) {
        this.intervalId = setInterval(this.fetchAllInfos, 2000);
      }
    },

    stopFetchingInfo() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    },

    async fetchProfilInfos() {
      try {
        if (!this.isBackendReachable) {
          console.warn('Backend ist nicht erreichbar');
          return;
        }

        const profileInfoResponse = await apiService.profileAction('show?active=true');

        if (profileInfoResponse && profileInfoResponse.Response) {
          this.profileInfo = profileInfoResponse.Response;
          this.getExistingEquipment(this.profileInfo);
        } else {
          console.error('Fehler in der Profil-API-Antwort:', profileInfoResponse?.Error);
        }
      } catch (error) {
        console.error('Fehler beim Abrufen der Profilinformationen:', error);
      }
    },

    getExistingEquipment(activeProfile) {
      this.existingEquipmentList = [];
      const apiMapping = {
        CameraSettings: 'camera',
        DomeSettings: 'dome',
        FilterWheelSettings: 'filter',
        FocuserSettings: 'focuser',
        SwitchSettings: 'switch',
        TelescopeSettings: 'mount',
        SafetyMonitorSettings: 'safety',
        FlatDeviceSettings: 'flatdevice',
        RotatorSettings: 'rotator',
        WeatherDataSettings: 'weather',
        GuiderSettings: 'guider',
      };
      const keysToCheck = Object.keys(apiMapping);

      keysToCheck.forEach((key) => {
        if (activeProfile && activeProfile[key]) {
          const device = activeProfile[key];

          if (key === 'GuiderSettings') {
            if (device.GuiderName && device.GuiderName !== 'No_Guider') {
              this.existingEquipmentList.push({
                type: key,
                id: device.GuiderName,
                apiName: apiMapping[key],
              });
            }
          } else if (key === 'RotatorSettings') {
            if (device.Id !== 'Manual Rotator' && device.Id !== 'No_Device') {
              this.existingEquipmentList.push({
                type: key,
                id: device.Id,
                apiName: apiMapping[key],
              });
            }
          } else if (key === 'FilterWheelSettings') {
            if (device.Id !== 'Manual Filter Wheel' && device.Id !== 'No_Device') {
              this.existingEquipmentList.push({
                type: key,
                id: device.Id,
                apiName: apiMapping[key],
              });
            }
          } else if (device.Id && device.Id !== 'No_Device') {
            this.existingEquipmentList.push({
              type: key,
              id: device.Id,
              apiName: apiMapping[key],
            });
          }
        }
      });
    },

    setDefaultCameraSettings() {
      const cStore = useCameraStore();
      const cameraSettings = this.profileInfo?.CameraSettings || {};
      cStore.coolingTemp = cameraSettings.Temperature ?? -10;
      cStore.coolingTime = cameraSettings.CoolingDuration ?? 10;
      cStore.warmingTime = cameraSettings.WarmingDuration ?? 10;
      console.log(
        'Kameraeinstellungen gesetzt:',
        cStore.coolingTemp,
        cStore.coolingTime,
        cStore.warmingTime
      );
    },
    setDefaultRotatorSettings() {
      this.rotatorMechanicalPosition = this.rotatorInfo?.MechanicalPosition ?? 0;
      console.log('Rotatoreinstellung gesetzt:', this.rotatorMechanicalPosition);
    },
    setDefaultCoordinates() {
      const cStore = useSettingsStore();
      cStore.coordinates.longitude = this.profileInfo.AstrometrySettings.Longitude;
      cStore.coordinates.latitude = this.profileInfo.AstrometrySettings.Latitude;
      cStore.coordinates.altitude = this.profileInfo.AstrometrySettings.Elevation;
    },
    checkVersionNewerOrEqual(currentVersion, minimumVersion) {
      const parseVersion = (version) => version.split('.').map(Number);

      const currentParts = parseVersion(currentVersion);
      const minimumParts = parseVersion(minimumVersion);

      for (let i = 0; i < minimumParts.length; i++) {
        const current = currentParts[i] || 0;
        const minimum = minimumParts[i] || 0;

        if (current > minimum) {
          this.isVersionNewerOrEqual = true;
          return true;
        }
        if (current < minimum) {
          this.isVersionNewerOrEqual = false;
          return false;
        }
      }
      this.isVersionNewerOrEqual = true;
      return true;
    },
  },
});

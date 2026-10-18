import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RaahiMap, type MapStop } from '@/components/RaahiMap';
import { useColors } from '@/hooks/useColors';

type Language = 'en' | 'hi' | 'hinglish';
type StopType = 'pickup' | 'drop' | 'cng' | 'petrol' | 'tea' | 'rest' | 'custom';
type NearbyType = 'cng' | 'petrol' | 'tea' | 'washroom' | 'custom';
type NearbyContext = 'route' | 'origin' | 'destination';
type Sheet = 'itinerary' | 'routes' | 'nearby' | 'destination' | 'newJourney' | null;
type Status = 'ready' | 'listening' | 'processing' | 'success' | 'error';

interface Stop extends MapStop {
  type: StopType;
  locality: string;
}

interface Journey {
  origin: string;
  stops: Stop[];
  destination: string;
}

interface RoutePreferences {
  avoidTolls: boolean;
  avoidHighways: boolean;
  avoidTraffic: boolean;
  routeStyle: 'fastest' | 'shortest';
  mode: 'car' | 'bike' | 'twoWheeler';
}

interface UndoSnapshot {
  journey: Journey;
  preferences: RoutePreferences;
}

const initialJourney: Journey = {
  origin: 'Connaught Place, New Delhi',
  stops: [
    {
      id: 'dhaula-kuan',
      name: 'Dhaula Kuan',
      locality: 'New Delhi',
      type: 'custom',
    },
  ],
  destination: 'Rohini, New Delhi',
};

const initialPreferences: RoutePreferences = {
  avoidTolls: false,
  avoidHighways: false,
  avoidTraffic: true,
  routeStyle: 'fastest',
  mode: 'car',
};

const destinationChoices = [
  'Rohini, New Delhi',
  'India Gate, New Delhi',
  'Indira Gandhi International Airport',
  'Noida Sector 18',
];

const examples: Record<Language, string[]> = {
  en: [
    'Add a CNG station near me',
    'Avoid tolls',
    'Add a chai stop',
    'Find a petrol pump',
    'Change destination to India Gate',
    'Find the fastest route',
  ],
  hi: [
    'मेरे पास CNG स्टेशन ढूँढो',
    'टोल से बचाओ',
    'चाय का स्टॉप जोड़ो',
    'पेट्रोल पंप ढूँढो',
    'India Gate चलो',
    'सबसे तेज़ रास्ता बताओ',
  ],
  hinglish: [
    'Paas mein CNG station dhoondo',
    'Toll se bachao',
    'Chai stop add karo',
    'Petrol pump dhoondo',
    'India Gate chalo',
    'Fastest route batao',
  ],
};

const textByLanguage = {
  en: {
    demo: 'DEMO JOURNEY',
    demoMap: 'DEMO MAP',
    eta: 'min',
    km: 'km',
    stops: 'stops',
    stop: 'stop',
    estimates: 'Demo estimates · not live routing',
    ready: 'Your Delhi demo route is ready.',
    copilot: 'RAAHI COPILOT',
    tapSpeak: 'Tap to speak',
    tapStop: 'Tap to finish demo',
    listening: 'Listening demo…',
    understanding: 'Understanding your request…',
    updating: 'Updating demo route…',
    updated: 'Route updated',
    failed: 'I didn’t catch that. Try one of the example commands.',
    voiceDemo: 'Voice demo · no microphone access',
    placeholder: 'Say or type a change…',
    send: 'Send command',
    safety: 'For your safety, make changes only when safely stopped.',
    itinerary: 'Itinerary',
    routeOptions: 'Route options',
    nearby: 'Nearby stops',
    newJourney: 'New journey',
    origin: 'Start',
    destination: 'Destination',
    onRoute: 'On route',
    nearOrigin: 'Near start',
    nearDestination: 'Near destination',
    add: 'Add stop',
    addPlace: 'Add a stop by name',
    noStops: 'No intermediate stops yet.',
    changeDestination: 'Change destination',
    startNavigation: 'Start navigation',
    endNavigation: 'End navigation',
    next: 'Continue straight for 500 m',
    navigationDemo: 'Navigation demo · no live GPS',
    recenter: 'Recenter',
    expandMap: 'Expand map',
    shrinkMap: 'Show copilot',
    expandCopilot: 'Expand copilot',
    collapseCopilot: 'Collapse copilot',
    undo: 'Undo',
    dismiss: 'Dismiss',
    fastest: 'Fastest',
    shortest: 'Shortest',
    avoidTolls: 'Avoid tolls',
    avoidTollsDesc: 'Prefer routes without toll roads.',
    avoidHighways: 'Avoid highways',
    avoidHighwaysDesc: 'Prefer smaller roads where possible.',
    avoidTraffic: 'Avoid traffic',
    avoidTrafficDesc: 'Use this as a demo route preference.',
    travelMode: 'Travel mode',
    car: 'Car',
    bike: 'Bike',
    twoWheeler: 'Two-wheeler',
    nearDemo: 'Approx. demo distance',
    alongDemo: 'Suggested along the demo route',
    addCandidate: 'Add',
    chooseDestination: 'Choose a destination',
    chooseDestinationHelp: 'Pick a demo destination. Existing stops will stay in order.',
    destinationQuestion: 'Where should I change the destination to?',
    startDestination: 'Where would you like to go?',
    startTrip: 'Start demo journey',
    customPlace: 'Type a destination',
    editStop: 'Edit stop name',
    save: 'Save',
    cancel: 'Cancel',
    moveUp: 'Move stop earlier',
    moveDown: 'Move stop later',
    removeStop: 'Remove stop',
    routeUpdated: 'Route updated',
    cngAdded: 'Done. I added a demo CNG stop before your destination.',
    teaAdded: 'Done. I added a demo chai stop before your destination.',
    pickupAdded: 'Done. I added a demo pickup before your destination.',
    destinationChanged: 'Done. I changed your demo destination.',
    tollChanged: 'Done. I updated the demo route preference to avoid tolls.',
    fastestChanged: 'Done. The demo is now set to the fastest route.',
    shortestChanged: 'Done. The demo is now set to the shortest route.',
    removed: 'Done. I removed the last intermediate stop.',
    preferenceChanged: 'Demo route preference updated.',
    added: 'Added to your demo journey.',
    chooseNearby: 'Choose a nearby demo stop to add.',
    editJourney: 'Edit journey',
    mode: 'Mode',
    routeSummary: 'Illustrative route data',
    routePreference: 'Demo route preference',
    noMatch: 'I can help with a stop, destination, tolls, or route preference.',
    home: 'Home',
    typePickup: 'Pickup',
    typeDrop: 'Drop',
    typeCng: 'CNG station',
    typePetrol: 'Petrol station',
    typeTea: 'Tea stop',
    typeRest: 'Rest stop',
    typeCustom: 'Custom stop',
  },
  hi: {
    demo: 'डेमो यात्रा',
    demoMap: 'डेमो नक्शा',
    eta: 'मिनट',
    km: 'किमी',
    stops: 'स्टॉप',
    stop: 'स्टॉप',
    estimates: 'डेमो अनुमान · लाइव रूट नहीं',
    ready: 'दिल्ली का डेमो रूट तैयार है।',
    copilot: 'राही कॉपायलट',
    tapSpeak: 'बोलने के लिए टैप करें',
    tapStop: 'डेमो रोकने के लिए टैप करें',
    listening: 'सुनने का डेमो…',
    understanding: 'आपकी बात समझ रहा हूँ…',
    updating: 'डेमो रूट बदल रहा है…',
    updated: 'रूट अपडेट हो गया',
    failed: 'समझ नहीं आया। उदाहरण कमांड में से एक आज़माएँ।',
    voiceDemo: 'वॉइस डेमो · माइक्रोफ़ोन चालू नहीं होता',
    placeholder: 'बदलाव बोलें या लिखें…',
    send: 'कमांड भेजें',
    safety: 'सुरक्षा के लिए, बदलाव केवल सुरक्षित रूप से रुकने पर करें।',
    itinerary: 'यात्रा के स्टॉप',
    routeOptions: 'रूट विकल्प',
    nearby: 'पास के स्टॉप',
    newJourney: 'नई यात्रा',
    origin: 'शुरुआत',
    destination: 'मंज़िल',
    onRoute: 'रास्ते में',
    nearOrigin: 'शुरुआत के पास',
    nearDestination: 'मंज़िल के पास',
    add: 'स्टॉप जोड़ें',
    addPlace: 'नाम से स्टॉप जोड़ें',
    noStops: 'अभी बीच में कोई स्टॉप नहीं है।',
    changeDestination: 'मंज़िल बदलें',
    startNavigation: 'नेविगेशन शुरू करें',
    endNavigation: 'नेविगेशन खत्म करें',
    next: '500 मीटर सीधे जाएँ',
    navigationDemo: 'नेविगेशन डेमो · लाइव GPS नहीं',
    recenter: 'मेरी जगह',
    expandMap: 'नक्शा बड़ा करें',
    shrinkMap: 'कॉपायलट दिखाएँ',
    expandCopilot: 'कॉपायलट खोलें',
    collapseCopilot: 'कॉपायलट छोटा करें',
    undo: 'वापस करें',
    dismiss: 'बंद करें',
    fastest: 'सबसे तेज़',
    shortest: 'सबसे छोटा',
    avoidTolls: 'टोल से बचें',
    avoidTollsDesc: 'बिना टोल वाले रास्ते चुनें।',
    avoidHighways: 'हाईवे से बचें',
    avoidHighwaysDesc: 'जहाँ हो सके छोटी सड़कें चुनें।',
    avoidTraffic: 'ट्रैफ़िक से बचें',
    avoidTrafficDesc: 'यह केवल डेमो रूट विकल्प है।',
    travelMode: 'यात्रा का साधन',
    car: 'कार',
    bike: 'बाइक',
    twoWheeler: 'दो-पहिया',
    nearDemo: 'लगभग डेमो दूरी',
    alongDemo: 'डेमो रूट के पास सुझाव',
    addCandidate: 'जोड़ें',
    chooseDestination: 'मंज़िल चुनें',
    chooseDestinationHelp: 'डेमो मंज़िल चुनें। मौजूदा स्टॉप उसी क्रम में रहेंगे।',
    destinationQuestion: 'मंज़िल कहाँ बदलनी है?',
    startDestination: 'आप कहाँ जाना चाहेंगे?',
    startTrip: 'डेमो यात्रा शुरू करें',
    customPlace: 'मंज़िल लिखें',
    editStop: 'स्टॉप का नाम बदलें',
    save: 'सेव करें',
    cancel: 'रद्द करें',
    moveUp: 'स्टॉप पहले करें',
    moveDown: 'स्टॉप बाद में करें',
    removeStop: 'स्टॉप हटाएँ',
    routeUpdated: 'रूट अपडेट हो गया',
    cngAdded: 'हो गया। मंज़िल से पहले डेमो CNG स्टॉप जोड़ा।',
    teaAdded: 'हो गया। मंज़िल से पहले डेमो चाय स्टॉप जोड़ा।',
    pickupAdded: 'हो गया। मंज़िल से पहले डेमो पिकअप जोड़ा।',
    destinationChanged: 'हो गया। डेमो मंज़िल बदल दी।',
    tollChanged: 'हो गया। डेमो रूट में टोल से बचने का विकल्प चालू है।',
    fastestChanged: 'हो गया। डेमो में सबसे तेज़ रूट चुना है।',
    shortestChanged: 'हो गया। डेमो में सबसे छोटा रूट चुना है।',
    removed: 'हो गया। आख़िरी बीच का स्टॉप हटाया।',
    preferenceChanged: 'डेमो रूट विकल्प अपडेट हुआ।',
    added: 'डेमो यात्रा में जोड़ दिया।',
    chooseNearby: 'जोड़ने के लिए पास का डेमो स्टॉप चुनें।',
    editJourney: 'यात्रा बदलें',
    mode: 'मोड',
    routeSummary: 'केवल उदाहरण के लिए रूट',
    routePreference: 'डेमो रूट विकल्प',
    noMatch: 'मैं स्टॉप, मंज़िल, टोल या रूट विकल्प में मदद कर सकता हूँ।',
    home: 'घर',
    typePickup: 'पिकअप',
    typeDrop: 'ड्रॉप',
    typeCng: 'CNG स्टेशन',
    typePetrol: 'पेट्रोल पंप',
    typeTea: 'चाय का स्टॉप',
    typeRest: 'आराम का स्टॉप',
    typeCustom: 'अन्य स्टॉप',
  },
  hinglish: {
    demo: 'DEMO JOURNEY',
    demoMap: 'DEMO MAP',
    eta: 'min',
    km: 'km',
    stops: 'stops',
    stop: 'stop',
    estimates: 'Demo estimate · live route nahi',
    ready: 'Delhi ka demo route ready hai.',
    copilot: 'RAAHI COPILOT',
    tapSpeak: 'Bolne ke liye tap karein',
    tapStop: 'Demo rokne ke liye tap karein',
    listening: 'Sunne ka demo…',
    understanding: 'Aapki baat samajh raha hoon…',
    updating: 'Demo route update ho raha hai…',
    updated: 'Route update ho gaya',
    failed: 'Samajh nahi aaya. Example command try karein.',
    voiceDemo: 'Voice demo · mic access nahi hota',
    placeholder: 'Change bolen ya type karein…',
    send: 'Command bhejein',
    safety: 'Safety ke liye changes sirf safely rukne par karein.',
    itinerary: 'Journey stops',
    routeOptions: 'Route options',
    nearby: 'Paas ke stops',
    newJourney: 'New journey',
    origin: 'Start',
    destination: 'Destination',
    onRoute: 'On route',
    nearOrigin: 'Start ke paas',
    nearDestination: 'Destination ke paas',
    add: 'Stop add karein',
    addPlace: 'Naam se stop add karein',
    noStops: 'Abhi koi beech ka stop nahi hai.',
    changeDestination: 'Destination badlein',
    startNavigation: 'Navigation shuru karein',
    endNavigation: 'Navigation khatam karein',
    next: '500 m seedha jaayein',
    navigationDemo: 'Navigation demo · live GPS nahi',
    recenter: 'Meri location',
    expandMap: 'Map bada karein',
    shrinkMap: 'Copilot dikhayein',
    expandCopilot: 'Copilot kholein',
    collapseCopilot: 'Copilot chhota karein',
    undo: 'Undo',
    dismiss: 'Band karein',
    fastest: 'Fastest',
    shortest: 'Shortest',
    avoidTolls: 'Toll se bachein',
    avoidTollsDesc: 'Toll road ke bina route prefer karein.',
    avoidHighways: 'Highway se bachein',
    avoidHighwaysDesc: 'Jahan mumkin ho chhoti sadkein lein.',
    avoidTraffic: 'Traffic se bachein',
    avoidTrafficDesc: 'Yeh demo route preference hai.',
    travelMode: 'Travel mode',
    car: 'Car',
    bike: 'Bike',
    twoWheeler: 'Two-wheeler',
    nearDemo: 'Approx demo distance',
    alongDemo: 'Demo route par suggestion',
    addCandidate: 'Add',
    chooseDestination: 'Destination choose karein',
    chooseDestinationHelp: 'Demo destination choose karein. Existing stops same order mein rahenge.',
    destinationQuestion: 'Destination kahan change karein?',
    startDestination: 'Aap kahan jaana chahte hain?',
    startTrip: 'Demo journey start karein',
    customPlace: 'Destination type karein',
    editStop: 'Stop ka naam edit karein',
    save: 'Save',
    cancel: 'Cancel',
    moveUp: 'Stop pehle karein',
    moveDown: 'Stop baad mein karein',
    removeStop: 'Stop hataayein',
    routeUpdated: 'Route update ho gaya',
    cngAdded: 'Ho gaya. Destination se pehle demo CNG stop add kiya.',
    teaAdded: 'Ho gaya. Destination se pehle demo chai stop add kiya.',
    pickupAdded: 'Ho gaya. Destination se pehle demo pickup add kiya.',
    destinationChanged: 'Ho gaya. Demo destination badal diya.',
    tollChanged: 'Ho gaya. Demo route mein toll avoid option on hai.',
    fastestChanged: 'Ho gaya. Demo mein fastest route select hai.',
    shortestChanged: 'Ho gaya. Demo mein shortest route select hai.',
    removed: 'Ho gaya. Aakhri beech ka stop hata diya.',
    preferenceChanged: 'Demo route preference update hui.',
    added: 'Demo journey mein add kar diya.',
    chooseNearby: 'Add karne ke liye paas ka demo stop choose karein.',
    editJourney: 'Journey edit karein',
    mode: 'Mode',
    routeSummary: 'Illustrative route data',
    routePreference: 'Demo route preference',
    noMatch: 'Main stop, destination, toll ya route preference mein help kar sakta hoon.',
    home: 'Home',
    typePickup: 'Pickup',
    typeDrop: 'Drop',
    typeCng: 'CNG station',
    typePetrol: 'Petrol station',
    typeTea: 'Chai stop',
    typeRest: 'Rest stop',
    typeCustom: 'Custom stop',
  },
} as const;

type Copy = (typeof textByLanguage)[Language];

function translateStopType(type: StopType, t: Copy) {
  switch (type) {
    case 'pickup':
      return t.typePickup;
    case 'drop':
      return t.typeDrop;
    case 'cng':
      return t.typeCng;
    case 'petrol':
      return t.typePetrol;
    case 'tea':
      return t.typeTea;
    case 'rest':
      return t.typeRest;
    default:
      return t.typeCustom;
  }
}

interface Candidate {
  id: string;
  name: string;
  locality: string;
  category: NearbyType;
  distance: string;
  reason: 'route' | 'nearby';
  type: StopType;
}

const candidateGroups: Record<
  NearbyType,
  Record<NearbyContext, Candidate[]>
> = {
  cng: {
    route: [
      {
        id: 'cng-dhaula',
        name: 'IGL CNG Station',
        locality: 'Dhaula Kuan',
        category: 'cng',
        distance: '~3 min detour',
        reason: 'route',
        type: 'cng',
      },
      {
        id: 'cng-patel',
        name: 'CNG Pump',
        locality: 'Patel Nagar',
        category: 'cng',
        distance: '~6 min detour',
        reason: 'route',
        type: 'cng',
      },
    ],
    origin: [
      {
        id: 'cng-cp',
        name: 'CNG Station',
        locality: 'Karol Bagh',
        category: 'cng',
        distance: '~2.1 km',
        reason: 'nearby',
        type: 'cng',
      },
      {
        id: 'cng-rajendra',
        name: 'IGL CNG Station',
        locality: 'Rajendra Place',
        category: 'cng',
        distance: '~3.4 km',
        reason: 'nearby',
        type: 'cng',
      },
    ],
    destination: [
      {
        id: 'cng-rohini',
        name: 'CNG Station',
        locality: 'Rohini Sector 10',
        category: 'cng',
        distance: '~1.8 km',
        reason: 'nearby',
        type: 'cng',
      },
      {
        id: 'cng-prashant',
        name: 'IGL CNG Station',
        locality: 'Prashant Vihar',
        category: 'cng',
        distance: '~3.2 km',
        reason: 'nearby',
        type: 'cng',
      },
    ],
  },
  petrol: {
    route: [
      {
        id: 'petrol-dhaula',
        name: 'IndianOil',
        locality: 'Dhaula Kuan',
        category: 'petrol',
        distance: '~2 min detour',
        reason: 'route',
        type: 'petrol',
      },
      {
        id: 'petrol-patel',
        name: 'HP Fuel Station',
        locality: 'Patel Nagar',
        category: 'petrol',
        distance: '~5 min detour',
        reason: 'route',
        type: 'petrol',
      },
    ],
    origin: [
      {
        id: 'petrol-karol',
        name: 'IndianOil',
        locality: 'Karol Bagh',
        category: 'petrol',
        distance: '~1.6 km',
        reason: 'nearby',
        type: 'petrol',
      },
      {
        id: 'petrol-minto',
        name: 'Bharat Petroleum',
        locality: 'Minto Road',
        category: 'petrol',
        distance: '~2.8 km',
        reason: 'nearby',
        type: 'petrol',
      },
    ],
    destination: [
      {
        id: 'petrol-rohini',
        name: 'IndianOil',
        locality: 'Rohini Sector 11',
        category: 'petrol',
        distance: '~1.9 km',
        reason: 'nearby',
        type: 'petrol',
      },
      {
        id: 'petrol-prashant',
        name: 'HP Fuel Station',
        locality: 'Prashant Vihar',
        category: 'petrol',
        distance: '~3 km',
        reason: 'nearby',
        type: 'petrol',
      },
    ],
  },
  tea: {
    route: [
      {
        id: 'tea-dhaula',
        name: 'Kulhad Chai Point',
        locality: 'Dhaula Kuan',
        category: 'tea',
        distance: '~2 min detour',
        reason: 'route',
        type: 'tea',
      },
      {
        id: 'tea-patel',
        name: 'Tea Break',
        locality: 'Patel Nagar',
        category: 'tea',
        distance: '~4 min detour',
        reason: 'route',
        type: 'tea',
      },
    ],
    origin: [
      {
        id: 'tea-cp',
        name: 'Chai Point',
        locality: 'Connaught Place',
        category: 'tea',
        distance: '~500 m',
        reason: 'nearby',
        type: 'tea',
      },
      {
        id: 'tea-baba',
        name: 'Kulhad Chai',
        locality: 'Mandi House',
        category: 'tea',
        distance: '~1.4 km',
        reason: 'nearby',
        type: 'tea',
      },
    ],
    destination: [
      {
        id: 'tea-rohini',
        name: 'Chai Stop',
        locality: 'Rohini Sector 10',
        category: 'tea',
        distance: '~700 m',
        reason: 'nearby',
        type: 'tea',
      },
      {
        id: 'tea-prashant',
        name: 'Tea Corner',
        locality: 'Prashant Vihar',
        category: 'tea',
        distance: '~1.6 km',
        reason: 'nearby',
        type: 'tea',
      },
    ],
  },
  washroom: {
    route: [
      {
        id: 'rest-dhaula',
        name: 'Public Convenience',
        locality: 'Dhaula Kuan',
        category: 'washroom',
        distance: '~3 min detour',
        reason: 'route',
        type: 'rest',
      },
      {
        id: 'rest-patel',
        name: 'Rest Stop',
        locality: 'Patel Nagar',
        category: 'washroom',
        distance: '~7 min detour',
        reason: 'route',
        type: 'rest',
      },
    ],
    origin: [
      {
        id: 'rest-cp',
        name: 'Public Convenience',
        locality: 'Connaught Place',
        category: 'washroom',
        distance: '~600 m',
        reason: 'nearby',
        type: 'rest',
      },
      {
        id: 'rest-minto',
        name: 'Rest Stop',
        locality: 'Minto Road',
        category: 'washroom',
        distance: '~1.8 km',
        reason: 'nearby',
        type: 'rest',
      },
    ],
    destination: [
      {
        id: 'rest-rohini',
        name: 'Public Convenience',
        locality: 'Rohini Sector 10',
        category: 'washroom',
        distance: '~800 m',
        reason: 'nearby',
        type: 'rest',
      },
      {
        id: 'rest-prashant',
        name: 'Rest Stop',
        locality: 'Prashant Vihar',
        category: 'washroom',
        distance: '~1.5 km',
        reason: 'nearby',
        type: 'rest',
      },
    ],
  },
  custom: {
    route: [
      {
        id: 'pickup-route',
        name: 'Passenger pickup',
        locality: 'Karol Bagh',
        category: 'custom',
        distance: '~4 min detour',
        reason: 'route',
        type: 'pickup',
      },
      {
        id: 'drop-route',
        name: 'Drop point',
        locality: 'Patel Nagar',
        category: 'custom',
        distance: '~6 min detour',
        reason: 'route',
        type: 'drop',
      },
    ],
    origin: [
      {
        id: 'pickup-origin',
        name: 'Passenger pickup',
        locality: 'Connaught Place',
        category: 'custom',
        distance: '~700 m',
        reason: 'nearby',
        type: 'pickup',
      },
      {
        id: 'pickup-karol',
        name: 'Pickup point',
        locality: 'Karol Bagh',
        category: 'custom',
        distance: '~2.4 km',
        reason: 'nearby',
        type: 'pickup',
      },
    ],
    destination: [
      {
        id: 'pickup-rohini',
        name: 'Passenger pickup',
        locality: 'Rohini Sector 10',
        category: 'custom',
        distance: '~900 m',
        reason: 'nearby',
        type: 'pickup',
      },
      {
        id: 'pickup-prashant',
        name: 'Pickup point',
        locality: 'Prashant Vihar',
        category: 'custom',
        distance: '~1.9 km',
        reason: 'nearby',
        type: 'pickup',
      },
    ],
  },
};

function newId() {
  return `${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`;
}

function displayPlace(place: string) {
  return place.split(',')[0] ?? place;
}

function getRouteMetrics(journey: Journey, preferences: RoutePreferences) {
  const dest = journey.destination.toLowerCase();
  let minutes = dest.includes('airport') ? 58 : dest.includes('noida') ? 49 : 42;
  let distance = dest.includes('airport') ? 24.2 : dest.includes('noida') ? 21.5 : 18.6;
  minutes += journey.stops.length * 6;
  distance += journey.stops.length * 2.2;
  if (preferences.avoidTolls) minutes += 4;
  if (preferences.avoidHighways) minutes += 5;
  if (preferences.routeStyle === 'shortest') {
    minutes += 5;
    distance -= 2.1;
  } else {
    minutes -= 2;
  }
  if (preferences.mode === 'bike' || preferences.mode === 'twoWheeler') {
    minutes -= 3;
    distance -= 0.8;
  }
  return {
    minutes: Math.max(8, Math.round(minutes)),
    distance: Math.max(2, distance).toFixed(1),
  };
}

export default function RaahiHomeScreen() {
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const colors = useColors(theme);
  const t = textByLanguage[language] as Copy;
  const [journey, setJourney] = useState<Journey>(initialJourney);
  const [preferences, setPreferences] =
    useState<RoutePreferences>(initialPreferences);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [status, setStatus] = useState<Status>('ready');
  const [assistantMessage, setAssistantMessage] = useState<string>(t.ready);
  const [toastMessage, setToastMessage] = useState('');
  const [command, setCommand] = useState('');
  const [transcript, setTranscript] = useState('');
  const [copilotExpanded, setCopilotExpanded] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);
  const [nearbyType, setNearbyType] = useState<NearbyType>('cng');
  const [nearbyContext, setNearbyContext] = useState<NearbyContext>('route');
  const [manualStop, setManualStop] = useState('');
  const [customDestination, setCustomDestination] = useState('');
  const [editingStop, setEditingStop] = useState<string | null>(null);
  const [editedStopName, setEditedStopName] = useState('');
  const [centerMessage, setCenterMessage] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.multiGet(['raahi-language', 'raahi-theme'])
      .then((entries) => {
        if (!mounted) return;
        const savedLanguage = entries.find(([key]) => key === 'raahi-language')?.[1];
        const savedTheme = entries.find(([key]) => key === 'raahi-theme')?.[1];
        if (savedLanguage === 'en' || savedLanguage === 'hi' || savedLanguage === 'hinglish') {
          setLanguage(savedLanguage);
        }
        if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
      })
      .catch(() => {
        // Keep the in-session defaults when device storage is unavailable.
      })
      .finally(() => {
        if (mounted) setStorageReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setAssistantMessage((current) => {
      const keys = Object.keys(textByLanguage.en) as (keyof Copy)[];
      const matchedKey = keys.find(
        (key) =>
          textByLanguage.en[key] === current ||
          textByLanguage.hi[key] === current ||
          textByLanguage.hinglish[key] === current,
      );
      return matchedKey ? textByLanguage[language][matchedKey] : current;
    });
  }, [language]);

  useEffect(() => {
    if (!storageReady) return;
    AsyncStorage.multiSet([
      ['raahi-language', language],
      ['raahi-theme', theme],
    ]).catch(() => {
      // The selected settings still work for the current session.
    });
  }, [language, theme, storageReady]);

  const metrics = useMemo(
    () => getRouteMetrics(journey, preferences),
    [journey, preferences],
  );
  const candidates = candidateGroups[nearbyType][nearbyContext];
  const isWeb = Platform.OS === 'web';
  const panelHeight = mapExpanded
    ? 86
    : copilotExpanded
      ? 360
      : 292;
  const safeTop = isWeb ? 67 : insets.top;
  const safeBottom = isWeb ? 34 : Math.max(insets.bottom, 12);
  const screenIsShort = dimensions.height < 740;

  const feedback = (message: string, nextStatus: Status = 'success') => {
    setAssistantMessage(message);
    setToastMessage(message);
    setStatus(nextStatus);
    setTranscript('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const commitJourney = (nextJourney: Journey, message: string) => {
    setUndoSnapshot({ journey, preferences });
    setJourney(nextJourney);
    feedback(message);
    setSheet(null);
  };

  const commitPreferences = (nextPreferences: RoutePreferences, message: string) => {
    setUndoSnapshot({ journey, preferences });
    setPreferences(nextPreferences);
    feedback(message);
  };

  const appendStop = (name: string, locality: string, type: StopType) => {
    const nextStop: Stop = {
      id: newId(),
      name,
      locality,
      type,
    };
    commitJourney(
      { ...journey, stops: [...journey.stops, nextStop] },
      type === 'cng' ? t.cngAdded : type === 'tea' ? t.teaAdded : t.added,
    );
  };

  const changeDestination = (destination: string) => {
    if (!destination.trim()) return;
    commitJourney({ ...journey, destination: destination.trim() }, t.destinationChanged);
  };

  const setPreference = <K extends keyof RoutePreferences>(
    key: K,
    value: RoutePreferences[K],
  ) => {
    if (preferences[key] === value) return;
    const nextPreferences = { ...preferences, [key]: value };
    const message =
      key === 'avoidTolls' && value
        ? t.tollChanged
        : key === 'routeStyle' && value === 'fastest'
          ? t.fastestChanged
          : key === 'routeStyle' && value === 'shortest'
            ? t.shortestChanged
            : t.preferenceChanged;
    commitPreferences(nextPreferences, message);
  };

  const showNearby = (type: NearbyType) => {
    setNearbyType(type);
    setNearbyContext('route');
    setSheet('nearby');
    setAssistantMessage(t.chooseNearby);
    setStatus('ready');
  };

  const executeCommand = (rawCommand: string) => {
    const query = rawCommand.trim().toLowerCase();
    if (!query) return;
    Keyboard.dismiss();
    setStatus('processing');
    setTranscript(rawCommand);
    setAssistantMessage(t.understanding);
    setTimeout(() => {
      const wantsSearch = /(find|nearest|near|search|nearby|look for|dhoond|dhund|paas|ढूंढ|ढूँढ|पास)/i.test(query);
      const cng = /cng|सीएनजी/i.test(query);
      const petrol = /petrol|fuel|पेट्रोल|ईंधन/i.test(query);
      const tea = /chai|tea|चाय/i.test(query);
      const washroom = /washroom|toilet|restroom|शौचालय/i.test(query);
      const pickup = /pickup|pick up|passenger|सवारी|पिकअप/i.test(query);

      if ((cng || petrol || tea || washroom) && wantsSearch) {
        showNearby(cng ? 'cng' : petrol ? 'petrol' : tea ? 'tea' : 'washroom');
        setAssistantMessage(t.chooseNearby);
        setStatus('success');
        return;
      }
      if (cng) {
        appendStop('CNG Station', 'Demo stop · Delhi', 'cng');
        return;
      }
      if (tea) {
        appendStop('Chai stop', 'Demo stop · Delhi', 'tea');
        return;
      }
      if (pickup) {
        appendStop('Passenger pickup', 'Demo stop · Delhi', 'pickup');
        return;
      }
      if (/(avoid|skip|mat lo|mat lena|bachao|बचो|बचाओ|से बच)/i.test(query) && /(toll|टोल)/i.test(query)) {
        setPreference('avoidTolls', true);
        return;
      }
      if (/(fastest|fast|quick|sabse tez|tez route|सबसे तेज़|तेज़ रास्ता)/i.test(query)) {
        setPreference('routeStyle', 'fastest');
        return;
      }
      if (/(shortest|shorter|kam distance|छोटा रास्ता|कम दूरी)/i.test(query)) {
        setPreference('routeStyle', 'shortest');
        return;
      }
      if (/(avoid traffic|traffic se bacha|ट्रैफ़िक से बच|ट्रैफिक से बच)/i.test(query)) {
        setPreference('avoidTraffic', true);
        return;
      }
      if (/(ghar|home|घर)/i.test(query)) {
        changeDestination('Home, New Delhi');
        return;
      }
      if (/(remove|delete|hata|nikal|हटा|निकाल)/i.test(query)) {
        if (journey.stops.length === 0) {
          feedback(t.noStops, 'error');
          return;
        }
        const nextStops = journey.stops.slice(0, -1);
        commitJourney({ ...journey, stops: nextStops }, t.removed);
        return;
      }
      const destination = destinationChoices.find((place) => {
        const parts = place.toLowerCase().split(/[ ,]+/);
        return parts.some((part) => part.length > 3 && query.includes(part));
      });
      if (destination) {
        changeDestination(destination);
        return;
      }
      if (/(destination|manzil|मंज़िल|मंजिल|change my destination)/i.test(query)) {
        setSheet('destination');
        setAssistantMessage(t.destinationQuestion);
        setStatus('ready');
        return;
      }
      if (/(petrol|fuel|washroom|toilet|स्नानघर)/i.test(query)) {
        showNearby(/petrol|fuel/i.test(query) ? 'petrol' : 'washroom');
        return;
      }
      feedback(t.noMatch, 'error');
    }, 420);
  };

  const startVoiceDemo = () => {
    if (status === 'listening') {
      const spokenDemo = 'Beech mein ek CNG pump add kar do.';
      setStatus('processing');
      setTranscript(spokenDemo);
      setAssistantMessage(t.updating);
      setTimeout(() => executeCommand(spokenDemo), 350);
      return;
    }
    setStatus('listening');
    setTranscript('');
    setAssistantMessage(t.listening);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const undoChange = () => {
    if (!undoSnapshot) return;
    setJourney(undoSnapshot.journey);
    setPreferences(undoSnapshot.preferences);
    setUndoSnapshot(null);
    setToastMessage('');
    setAssistantMessage(t.routeUpdated);
    setStatus('success');
  };

  const addCandidate = (candidate: Candidate) => {
    appendStop(candidate.name, candidate.locality, candidate.type);
  };

  const moveStop = (id: string, direction: -1 | 1) => {
    const index = journey.stops.findIndex((stop) => stop.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= journey.stops.length) return;
    const nextStops = [...journey.stops];
    const [selected] = nextStops.splice(index, 1);
    if (!selected) return;
    nextStops.splice(target, 0, selected);
    commitJourney({ ...journey, stops: nextStops }, t.routeUpdated);
  };

  const removeStop = (id: string) => {
    const nextStops = journey.stops.filter((stop) => stop.id !== id);
    commitJourney({ ...journey, stops: nextStops }, t.removed);
  };

  const saveEditedStop = (id: string) => {
    const name = editedStopName.trim();
    if (!name) return;
    const nextStops = journey.stops.map((stop) =>
      stop.id === id ? { ...stop, name } : stop,
    );
    commitJourney({ ...journey, stops: nextStops }, t.routeUpdated);
    setEditingStop(null);
  };

  const createJourney = () => {
    const destination = customDestination.trim();
    if (!destination) return;
    setUndoSnapshot({ journey, preferences });
    setJourney({ ...journey, stops: [], destination });
    setNavigationActive(false);
    setCustomDestination('');
    feedback(t.destinationChanged);
    setSheet(null);
  };

  const handleSubmit = () => {
    const value = command.trim();
    if (!value) return;
    setCommand('');
    executeCommand(value);
  };

  const cycleTheme = () => setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  const languageOrder: Language[] = ['en', 'hi', 'hinglish'];
  const languageLabels: Record<Language, string> = {
    en: 'EN',
    hi: 'हिं',
    hinglish: 'HI+',
  };
  const renderSheetTitle = () => {
    if (sheet === 'itinerary') return t.itinerary;
    if (sheet === 'routes') return t.routeOptions;
    if (sheet === 'nearby') return t.nearby;
    if (sheet === 'destination') return t.chooseDestination;
    return t.newJourney;
  };

  const toggleRow = (
    title: string,
    description: string,
    key: 'avoidTolls' | 'avoidHighways' | 'avoidTraffic',
  ) => (
    <View key={key} style={[styles.preferenceRow, { borderBottomColor: colors.border }]}>
      <View style={styles.preferenceCopy}>
        <Text style={[styles.sheetItemTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
          {description}
        </Text>
      </View>
      <Switch
        accessibilityLabel={title}
        testID={`preference-${key}`}
        value={preferences[key]}
        onValueChange={(value) => setPreference(key, value)}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={Platform.OS === 'android' ? colors.card : undefined}
      />
    </View>
  );

  const pressableStyle = ({ pressed }: { pressed: boolean }) => [
    pressed ? styles.pressed : null,
  ];

  const openEdit = (stop: Stop) => {
    setEditingStop(stop.id);
    setEditedStopName(stop.name);
  };

  const renderSheetContent = () => {
    if (sheet === 'itinerary') {
      return (
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.itineraryEndpoint}>
            <View style={[styles.endpointDot, { backgroundColor: colors.primary }]} />
            <View style={styles.stopTextBlock}>
              <Text style={[styles.stopTypeLabel, { color: colors.mutedForeground }]}>{t.origin}</Text>
              <Text style={[styles.sheetItemTitle, { color: colors.foreground }]}>{journey.origin}</Text>
            </View>
          </View>
          {journey.stops.length === 0 ? (
            <View style={[styles.emptyStops, { borderColor: colors.border }]}>
              <Feather name="corner-down-right" size={18} color={colors.mutedForeground} />
              <Text style={[styles.helperText, { color: colors.mutedForeground }]}>{t.noStops}</Text>
            </View>
          ) : (
            journey.stops.map((stop, index) => (
              <View
                key={stop.id}
                style={[styles.itineraryRow, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.stopNumber, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.stopNumberText, { color: colors.accentForeground }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.stopTextBlock}>
                  {editingStop === stop.id ? (
                    <TextInput
                      value={editedStopName}
                      onChangeText={setEditedStopName}
                      accessibilityLabel={t.editStop}
                      placeholder={t.editStop}
                      placeholderTextColor={colors.mutedForeground}
                      style={[
                        styles.input,
                        styles.editStopInput,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          color: colors.foreground,
                        },
                      ]}
                      returnKeyType="done"
                      onSubmitEditing={() => saveEditedStop(stop.id)}
                    />
                  ) : (
                    <>
                      <Text style={[styles.sheetItemTitle, { color: colors.foreground }]}>{stop.name}</Text>
                      <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                        {stop.locality} · {translateStopType(stop.type, t)}
                      </Text>
                    </>
                  )}
                </View>
                {editingStop === stop.id ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.save}
                    testID={`save-stop-${stop.id}`}
                    onPress={() => saveEditedStop(stop.id)}
                    style={styles.smallTextAction}
                  >
                    <Text style={[styles.actionText, { color: colors.primary }]}>{t.save}</Text>
                  </Pressable>
                ) : (
                  <View style={styles.rowActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t.moveUp}
                      testID={`move-up-${stop.id}`}
                      onPress={() => moveStop(stop.id, -1)}
                      disabled={index === 0}
                      style={pressableStyle}
                    >
                      <Feather name="chevron-up" size={20} color={index === 0 ? colors.border : colors.foreground} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t.moveDown}
                      testID={`move-down-${stop.id}`}
                      onPress={() => moveStop(stop.id, 1)}
                      disabled={index === journey.stops.length - 1}
                      style={pressableStyle}
                    >
                      <Feather
                        name="chevron-down"
                        size={20}
                        color={index === journey.stops.length - 1 ? colors.border : colors.foreground}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t.editStop}
                      testID={`edit-stop-${stop.id}`}
                      onPress={() => openEdit(stop)}
                      style={pressableStyle}
                    >
                      <Feather name="edit-2" size={17} color={colors.foreground} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t.removeStop}
                      testID={`remove-stop-${stop.id}`}
                      onPress={() => removeStop(stop.id)}
                      style={pressableStyle}
                    >
                      <Feather name="x" size={19} color={colors.destructive} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))
          )}
          <View style={styles.itineraryEndpoint}>
            <View style={[styles.destinationDot, { backgroundColor: colors.destructive }]} />
            <View style={styles.stopTextBlock}>
              <Text style={[styles.stopTypeLabel, { color: colors.mutedForeground }]}>{t.destination}</Text>
              <Text style={[styles.sheetItemTitle, { color: colors.foreground }]}>{journey.destination}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.changeDestination}
              testID="change-destination"
              onPress={() => setSheet('destination')}
              style={styles.smallTextAction}
            >
              <Text style={[styles.actionText, { color: colors.primary }]}>{t.changeDestination}</Text>
            </Pressable>
          </View>
          <View style={[styles.manualAddRow, { borderColor: colors.border }]}>
            <TextInput
              value={manualStop}
              onChangeText={setManualStop}
              accessibilityLabel={t.addPlace}
              placeholder={t.addPlace}
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                styles.manualInput,
                { backgroundColor: colors.background, color: colors.foreground },
              ]}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!manualStop.trim()) return;
                appendStop(manualStop.trim(), 'Custom demo stop', 'custom');
                setManualStop('');
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.add}
              testID="add-manual-stop"
              onPress={() => {
                if (!manualStop.trim()) return;
                appendStop(manualStop.trim(), 'Custom demo stop', 'custom');
                setManualStop('');
              }}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
              <Text style={[styles.addButtonText, { color: colors.primaryForeground }]}>{t.add}</Text>
            </Pressable>
          </View>
        </ScrollView>
      );
    }

    if (sheet === 'routes') {
      return (
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
        >
          <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>
            {t.routePreference}
          </Text>
          <View style={styles.choiceRow}>
            {(['fastest', 'shortest'] as const).map((choice) => {
              const selected = preferences.routeStyle === choice;
              return (
                <Pressable
                  key={choice}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  testID={`route-style-${choice}`}
                  onPress={() => setPreference('routeStyle', choice)}
                  style={[
                    styles.choiceButton,
                    {
                      backgroundColor: selected ? colors.accent : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={choice === 'fastest' ? 'zap' : 'minimize-2'}
                    size={17}
                    color={selected ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.choiceText,
                      { color: selected ? colors.accentForeground : colors.foreground },
                    ]}
                  >
                    {choice === 'fastest' ? t.fastest : t.shortest}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {toggleRow(t.avoidTolls, t.avoidTollsDesc, 'avoidTolls')}
          {toggleRow(t.avoidHighways, t.avoidHighwaysDesc, 'avoidHighways')}
          {toggleRow(t.avoidTraffic, t.avoidTrafficDesc, 'avoidTraffic')}
          <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground, marginTop: 12 }]}>
            {t.travelMode}
          </Text>
          <View style={styles.modeRow}>
            {(['car', 'bike', 'twoWheeler'] as const).map((mode) => {
              const selected = preferences.mode === mode;
              const label = mode === 'car' ? t.car : mode === 'bike' ? t.bike : t.twoWheeler;
              return (
                <Pressable
                  key={mode}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  testID={`mode-${mode}`}
                  onPress={() => setPreference('mode', mode)}
                  style={[
                    styles.modeButton,
                    {
                      backgroundColor: selected ? colors.accent : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={mode === 'car' ? 'car-outline' : mode === 'bike' ? 'bike' : 'scooter'}
                    size={20}
                    color={selected ? colors.primary : colors.foreground}
                  />
                  <Text style={[styles.modeText, { color: colors.foreground }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.helperText, { color: colors.mutedForeground, marginTop: 12 }]}>
            {t.estimates}
          </Text>
        </ScrollView>
      );
    }

    if (sheet === 'nearby') {
      const contexts: { value: NearbyContext; label: string }[] = [
        { value: 'route', label: t.onRoute },
        { value: 'origin', label: t.nearOrigin },
        { value: 'destination', label: t.nearDestination },
      ];
      return (
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
        >
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            {t.chooseNearby} · {t.nearDemo}
          </Text>
          <View style={styles.contextRow}>
            {contexts.map((context) => (
              <Pressable
                key={context.value}
                accessibilityRole="tab"
                accessibilityState={{ selected: nearbyContext === context.value }}
                testID={`nearby-context-${context.value}`}
                onPress={() => setNearbyContext(context.value)}
                style={[
                  styles.contextChip,
                  {
                    backgroundColor:
                      nearbyContext === context.value ? colors.accent : colors.secondary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.contextText,
                    {
                      color:
                        nearbyContext === context.value
                          ? colors.accentForeground
                          : colors.secondaryForeground,
                    },
                  ]}
                >
                  {context.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {candidates.map((candidate) => (
            <View
              key={candidate.id}
              style={[styles.candidateCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.candidateIcon, { backgroundColor: colors.accent }]}>
                <MaterialCommunityIcons
                  name={
                    candidate.type === 'cng'
                      ? 'gas-station-outline'
                      : candidate.type === 'petrol'
                        ? 'gas-station'
                        : candidate.type === 'tea'
                          ? 'coffee-outline'
                          : 'toilet'
                  }
                  size={20}
                  color={colors.accentForeground}
                />
              </View>
              <View style={styles.candidateDetails}>
                <Text style={[styles.sheetItemTitle, { color: colors.foreground }]}>{candidate.name}</Text>
                <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                  {candidate.locality} · {candidate.distance}
                </Text>
                <Text style={[styles.candidateReason, { color: colors.mutedForeground }]}>
                  {candidate.reason === 'route' ? t.alongDemo : t.nearDemo}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t.addCandidate} ${candidate.name}`}
                testID={`add-candidate-${candidate.id}`}
                onPress={() => addCandidate(candidate)}
                style={[styles.addCandidateButton, { backgroundColor: colors.primary }]}
              >
                <Feather name="plus" size={16} color={colors.primaryForeground} />
                <Text style={[styles.addButtonText, { color: colors.primaryForeground }]}>{t.addCandidate}</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      );
    }

    if (sheet === 'destination') {
      return (
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
        >
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            {t.chooseDestinationHelp}
          </Text>
          {destinationChoices.map((destination) => (
            <Pressable
              key={destination}
              accessibilityRole="button"
              accessibilityLabel={`${t.changeDestination}: ${destination}`}
              testID={`destination-${destinationChoices.indexOf(destination)}`}
              onPress={() => changeDestination(destination)}
              style={[
                styles.destinationChoice,
                { borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.destinationIcon, { backgroundColor: colors.accent }]}>
                <Feather name="map-pin" size={17} color={colors.primary} />
              </View>
              <Text style={[styles.sheetItemTitle, { color: colors.foreground, flex: 1 }]}>
                {destination}
              </Text>
              <Feather name="arrow-up-right" size={17} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </ScrollView>
      );
    }

    return (
      <View style={styles.sheetContent}>
        <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
          {t.startDestination}
        </Text>
        {destinationChoices.slice(0, 3).map((destination) => (
          <Pressable
            key={destination}
            accessibilityRole="button"
            testID={`new-journey-${destinationChoices.indexOf(destination)}`}
            onPress={() => {
              setUndoSnapshot({ journey, preferences });
              setJourney({ ...journey, stops: [], destination });
              setNavigationActive(false);
              feedback(t.destinationChanged);
              setSheet(null);
            }}
            style={[styles.destinationChoice, { borderBottomColor: colors.border }]}
          >
            <View style={[styles.destinationIcon, { backgroundColor: colors.accent }]}>
              <Feather name="map-pin" size={17} color={colors.primary} />
            </View>
            <Text style={[styles.sheetItemTitle, { color: colors.foreground, flex: 1 }]}>
              {destination}
            </Text>
            <Feather name="arrow-up-right" size={17} color={colors.mutedForeground} />
          </Pressable>
        ))}
        <TextInput
          value={customDestination}
          onChangeText={setCustomDestination}
          accessibilityLabel={t.customPlace}
          placeholder={t.customPlace}
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            styles.destinationInput,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          returnKeyType="done"
          onSubmitEditing={createJourney}
        />
        <Pressable
          accessibilityRole="button"
          testID="create-custom-journey"
          onPress={createJourney}
          disabled={!customDestination.trim()}
          style={[
            styles.primaryAction,
            {
              backgroundColor: colors.primary,
              opacity: customDestination.trim() ? 1 : 0.5,
            },
          ]}
        >
          <Feather name="navigation" size={17} color={colors.primaryForeground} />
          <Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>
            {t.startTrip}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: safeTop,
        },
      ]}
    >
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.brandMark, { backgroundColor: colors.copilot }]}>
          <Feather name="map-pin" size={17} color={colors.primary} />
        </View>
        <View style={styles.brandCopy}>
          <Text style={[styles.brandName, { color: colors.foreground }]}>Raahi</Text>
          <Text style={[styles.brandHindi, { color: colors.mutedForeground }]}>राही</Text>
        </View>
        <View style={styles.headerSpacer} />
        <View style={[styles.languageControl, { backgroundColor: colors.secondary }]}>
          {languageOrder.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Interface language: ${item === 'en' ? 'English' : item === 'hi' ? 'Hindi' : 'Hinglish'}`}
              accessibilityState={{ selected: language === item }}
              testID={`language-${item}`}
              onPress={() => {
                setLanguage(item);
                Haptics.selectionAsync().catch(() => {});
              }}
              style={[
                styles.languageButton,
                language === item ? { backgroundColor: colors.card } : null,
              ]}
            >
              <Text
                style={[
                  styles.languageText,
                  { color: language === item ? colors.foreground : colors.mutedForeground },
                ]}
              >
                {languageLabels[item]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          testID="toggle-theme"
          onPress={cycleTheme}
          style={({ pressed }) => [styles.themeButton, pressed ? styles.pressed : null]}
        >
          <Feather name={theme === 'light' ? 'moon' : 'sun'} size={19} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.mapArea}>
        <RaahiMap
          stops={journey.stops}
          destination={displayPlace(journey.destination)}
          active={navigationActive}
          colors={colors}
        />
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={[styles.demoMapBadge, { backgroundColor: colors.card }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.demoBadgeText, { color: colors.foreground }]}>{t.demoMap}</Text>
          </View>
          <View style={[styles.routeCard, { backgroundColor: colors.card }]}>
            <View style={styles.routeCardTop}>
              <View style={styles.routeCardIcon}>
                <Feather name="navigation" size={15} color={colors.primary} />
              </View>
              <View style={styles.routeCardTitleBlock}>
                <Text style={[styles.routeDestination, { color: colors.foreground }]} numberOfLines={1}>
                  {displayPlace(journey.destination)}
                </Text>
                <Text style={[styles.routeEstimate, { color: colors.mutedForeground }]}>
                  {t.demo} · {t.estimates}
                </Text>
              </View>
            </View>
            <View style={styles.routeMetricRow}>
              <Text style={[styles.routeMetricStrong, { color: colors.foreground }]}>
                {metrics.minutes} <Text style={[styles.routeMetricUnit, { color: colors.mutedForeground }]}>{t.eta}</Text>
              </Text>
              <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.routeMetricStrong, { color: colors.foreground }]}>
                {metrics.distance} <Text style={[styles.routeMetricUnit, { color: colors.mutedForeground }]}>{t.km}</Text>
              </Text>
              <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.routeMetricStrong, { color: colors.foreground }]}>
                {journey.stops.length} <Text style={[styles.routeMetricUnit, { color: colors.mutedForeground }]}>{journey.stops.length === 1 ? t.stop : t.stops}</Text>
              </Text>
            </View>
            {!navigationActive ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.startNavigation}
                testID="start-navigation"
                onPress={() => {
                  setNavigationActive(true);
                  setMapExpanded(false);
                  setAssistantMessage(t.navigationDemo);
                  setStatus('ready');
                }}
                style={({ pressed }) => [
                  styles.routeStartButton,
                  { backgroundColor: colors.primary },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Feather name="navigation" size={14} color={colors.primaryForeground} />
                <Text style={[styles.routeStartText, { color: colors.primaryForeground }]}>
                  {t.startNavigation}
                </Text>
                <Text style={[styles.routeStartMetric, { color: colors.primaryForeground }]}>
                  {metrics.minutes} {t.eta}
                </Text>
              </Pressable>
            ) : null}
            {navigationActive ? (
              <View style={[styles.instructionRow, { backgroundColor: colors.accent }]}>
                <Feather name="corner-up-right" size={16} color={colors.accentForeground} />
                <Text style={[styles.instructionText, { color: colors.accentForeground }]}>
                  {t.next}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.mapActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.routeOptions}
              testID="open-route-options"
              onPress={() => setSheet('routes')}
              style={({ pressed }) => [
                styles.mapAction,
                { backgroundColor: colors.card },
                pressed ? styles.pressed : null,
              ]}
            >
              <Feather name="sliders" size={17} color={colors.foreground} />
              <Text style={[styles.mapActionText, { color: colors.foreground }]}>{t.routeOptions}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.itinerary}
              testID="open-itinerary"
              onPress={() => setSheet('itinerary')}
              style={({ pressed }) => [
                styles.mapAction,
                { backgroundColor: colors.card },
                pressed ? styles.pressed : null,
              ]}
            >
              <Feather name="list" size={17} color={colors.foreground} />
              <Text style={[styles.mapActionText, { color: colors.foreground }]}>{t.itinerary}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.recenter}
              testID="recenter-map"
              onPress={() => {
                setCenterMessage(true);
                setTimeout(() => setCenterMessage(false), 1800);
              }}
              style={({ pressed }) => [
                styles.mapAction,
                { backgroundColor: colors.card },
                pressed ? styles.pressed : null,
              ]}
            >
              <Feather name="crosshair" size={17} color={colors.foreground} />
              <Text style={[styles.mapActionText, { color: colors.foreground }]}>{t.recenter}</Text>
            </Pressable>
          </View>

          {centerMessage ? (
            <View style={[styles.centerToast, { backgroundColor: colors.copilot }]}>
              <Text style={[styles.centerToastText, { color: colors.copilotText }]}>{t.recenter}</Text>
            </View>
          ) : null}

          {navigationActive ? (
            <View style={[styles.navigationBadge, { backgroundColor: colors.copilot }]}>
              <View style={[styles.navigationDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.navigationText, { color: colors.copilotText }]}>
                {t.navigationDemo}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.endNavigation}
                testID="end-navigation"
                onPress={() => setNavigationActive(false)}
                style={[styles.endNavigationButton, { backgroundColor: colors.copilotSecondary }]}
              >
                <Text style={[styles.endNavigationText, { color: colors.copilotText }]}>{t.endNavigation}</Text>
              </Pressable>
            </View>
          ) : null}

          {toastMessage && !navigationActive ? (
            <View style={[styles.toast, { backgroundColor: colors.copilot }]}>
              <Text numberOfLines={1} style={[styles.toastText, { color: colors.copilotText }]}>
                {toastMessage}
              </Text>
              {undoSnapshot ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.undo}
                  testID="undo-change"
                  onPress={undoChange}
                  style={styles.undoButton}
                >
                  <Text style={[styles.undoText, { color: colors.primary }]}>{t.undo}</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.dismiss}
                onPress={() => setToastMessage('')}
                style={styles.dismissButton}
              >
                <Feather name="x" size={16} color={colors.copilotMuted} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.copilotPanel,
          {
            height: panelHeight + safeBottom,
            paddingBottom: safeBottom,
            backgroundColor: colors.copilot,
          },
        ]}
      >
        {mapExpanded ? (
          <View style={styles.collapsedCopilot}>
            <View style={styles.collapsedCopilotCopy}>
              <View style={[styles.collapsedStatusDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.collapsedText, { color: colors.copilotText }]}>{t.copilot}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={status === 'listening' ? t.tapStop : t.tapSpeak}
              testID="collapsed-voice-demo-button"
              onPress={startVoiceDemo}
              style={[styles.collapsedMicButton, { backgroundColor: colors.primary }]}
            >
              <Feather
                name={status === 'listening' ? 'square' : 'mic'}
                size={17}
                color={colors.primaryForeground}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.shrinkMap}
              testID="restore-copilot"
              onPress={() => setMapExpanded(false)}
              style={[styles.restoreCopilotButton, { backgroundColor: colors.copilotSecondary }]}
            >
              <Feather name="chevron-up" size={18} color={colors.copilotText} />
              <Text style={[styles.restoreCopilotText, { color: colors.copilotText }]}>{t.shrinkMap}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.copilotHeader}>
              <View style={styles.copilotHeading}>
                <View style={[styles.copilotStatus, { backgroundColor: colors.primary }]} />
                <Text style={[styles.copilotTitle, { color: colors.copilotText }]}>{t.copilot}</Text>
                <Text style={[styles.copilotStatusLabel, { color: colors.copilotMuted }]}>
                  {status === 'listening' ? t.listening : status === 'processing' ? t.updating : t.demo}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copilotExpanded ? t.collapseCopilot : t.expandCopilot}
                testID="toggle-copilot"
                onPress={() => setCopilotExpanded((expanded) => !expanded)}
                style={({ pressed }) => [styles.copilotExpand, pressed ? styles.pressed : null]}
              >
                <Feather
                  name={copilotExpanded ? 'chevron-down' : 'chevron-up'}
                  size={18}
                  color={colors.copilotMuted}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.expandMap}
                testID="expand-map"
                onPress={() => setMapExpanded(true)}
                style={({ pressed }) => [styles.copilotExpand, pressed ? styles.pressed : null]}
              >
                <Feather name="maximize-2" size={16} color={colors.copilotMuted} />
              </Pressable>
            </View>

            <Text
              accessibilityLiveRegion="polite"
              numberOfLines={copilotExpanded ? 2 : 1}
              style={[
                styles.assistantMessage,
                { color: status === 'error' ? '#FCA5A5' : colors.copilotText },
              ]}
            >
              {assistantMessage}
            </Text>
            {transcript ? (
              <Text numberOfLines={1} style={[styles.transcript, { color: colors.primary }]}>
                “{transcript}”
              </Text>
            ) : null}

            <View style={styles.voiceRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={status === 'listening' ? t.tapStop : t.tapSpeak}
                accessibilityHint={t.voiceDemo}
                testID="voice-demo-button"
                onPress={startVoiceDemo}
                style={({ pressed }) => [
                  styles.micButton,
                  { backgroundColor: status === 'listening' ? '#DC2626' : colors.primary },
                  pressed ? styles.micPressed : null,
                ]}
              >
                <Feather
                  name={status === 'listening' ? 'square' : 'mic'}
                  size={24}
                  color={status === 'listening' ? '#FFFFFF' : colors.primaryForeground}
                />
              </Pressable>
              <View style={styles.voiceCopy}>
                <Text style={[styles.voicePrompt, { color: colors.copilotText }]}>
                  {status === 'listening'
                    ? t.tapStop
                    : status === 'processing'
                      ? t.understanding
                      : status === 'success'
                        ? t.updated
                        : t.tapSpeak}
                </Text>
                <Text style={[styles.voiceSubtext, { color: colors.copilotMuted }]}>
                  {t.voiceDemo}
                </Text>
              </View>
              <View style={[styles.languagePill, { backgroundColor: colors.copilotSecondary }]}>
                <Feather name="globe" size={13} color={colors.primary} />
                <Text style={[styles.languagePillText, { color: colors.copilotMuted }]}>
                  {language === 'en' ? 'EN' : language === 'hi' ? 'हिंदी' : 'HI+'}
                </Text>
              </View>
            </View>

            <View style={[styles.commandBox, { backgroundColor: colors.copilotSecondary }]}>
              <TextInput
                accessibilityLabel={t.placeholder}
                testID="command-input"
                value={command}
                onChangeText={setCommand}
                placeholder={t.placeholder}
                placeholderTextColor={colors.copilotMuted}
                style={[styles.commandInput, { color: colors.copilotText }]}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                blurOnSubmit
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.send}
                testID="submit-command"
                onPress={handleSubmit}
                disabled={!command.trim()}
                style={({ pressed }) => [
                  styles.sendButton,
                  { backgroundColor: command.trim() ? colors.primary : '#334155' },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Feather name="arrow-up" size={19} color={command.trim() ? colors.primaryForeground : colors.copilotMuted} />
              </Pressable>
            </View>

            {copilotExpanded ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.exampleRow}
                keyboardShouldPersistTaps="handled"
              >
                {examples[language].map((example) => (
                  <Pressable
                    key={example}
                    accessibilityRole="button"
                    testID={`example-${examples[language].indexOf(example)}`}
                    onPress={() => executeCommand(example)}
                    style={[styles.exampleChip, { backgroundColor: colors.copilotSecondary }]}
                  >
                    <Text style={[styles.exampleText, { color: colors.copilotText }]}>{example}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.panelFooter}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.exampleRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {examples[language].slice(0, screenIsShort ? 3 : 4).map((example) => (
                    <Pressable
                      key={example}
                      accessibilityRole="button"
                      testID={`quick-example-${examples[language].indexOf(example)}`}
                      onPress={() => executeCommand(example)}
                      style={[styles.exampleChip, { backgroundColor: colors.copilotSecondary }]}
                    >
                      <Text style={[styles.exampleText, { color: colors.copilotText }]}>{example}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <Text style={[styles.safetyText, { color: colors.copilotMuted }]} numberOfLines={1}>
              {t.safety}
            </Text>
          </>
        )}
      </View>

      {!navigationActive ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.newJourney}
          testID="new-journey"
          onPress={() => setSheet('newJourney')}
          style={({ pressed }) => [
            styles.newJourneyFloating,
            {
              backgroundColor: colors.card,
              top: safeTop + 56 + 11,
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <Feather name="plus" size={18} color={colors.foreground} />
          <Text style={[styles.newJourneyText, { color: colors.foreground }]}>{t.newJourney}</Text>
        </Pressable>
      ) : null}

      <Modal
        visible={sheet !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSheet(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel={t.cancel}
            style={styles.modalBackdrop}
            onPress={() => setSheet(null)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                maxHeight: Math.min(dimensions.height * 0.84, 700),
                paddingBottom: Math.max(insets.bottom, 18),
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                  {renderSheetTitle()}
                </Text>
                {sheet === 'itinerary' ? (
                  <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
                    {t.routeSummary}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.cancel}
                testID="close-sheet"
                onPress={() => setSheet(null)}
                style={styles.sheetClose}
              >
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            {renderSheetContent()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 7,
  },
  brandMark: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  brandCopy: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  brandName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    letterSpacing: -0.5,
  },
  brandHindi: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerSpacer: {
    flex: 1,
  },
  languageControl: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 9,
    gap: 1,
  },
  languageButton: {
    minWidth: 32,
    height: 27,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  languageText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  themeButton: {
    width: 34,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  mapArea: {
    flex: 1,
    minHeight: 240,
    overflow: 'hidden',
  },
  demoMapBadge: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#0B1220',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  demoBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  routeCard: {
    position: 'absolute',
    top: 48,
    left: 12,
    width: 210,
    padding: 11,
    borderRadius: 13,
    shadowColor: '#0B1220',
    shadowOpacity: 0.12,
    shadowRadius: 13,
    elevation: 3,
  },
  routeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeCardIcon: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D8F6F1',
    borderRadius: 8,
  },
  routeCardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  routeDestination: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  routeEstimate: {
    fontSize: 9,
    marginTop: 2,
  },
  routeMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
    gap: 8,
  },
  routeMetricStrong: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  routeMetricUnit: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
  },
  routeStartButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  routeStartText: {
    flex: 1,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
  routeStartMetric: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
  },
  metricDivider: {
    width: 1,
    height: 15,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
  },
  instructionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    flexShrink: 1,
  },
  mapActions: {
    position: 'absolute',
    right: 10,
    bottom: 62,
    gap: 7,
    alignItems: 'flex-end',
  },
  mapAction: {
    minHeight: 38,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    shadowColor: '#0B1220',
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 2,
  },
  mapActionText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  centerToast: {
    position: 'absolute',
    right: 12,
    bottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  centerToastText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  navigationBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '54%',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
  },
  navigationDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
  },
  navigationText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    flex: 1,
  },
  endNavigationButton: {
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 7,
  },
  endNavigationText: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
  },
  toast: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 11,
    shadowColor: '#0B1220',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  toastText: {
    flex: 1,
    fontSize: 10,
  },
  undoButton: {
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  undoText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  dismissButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copilotPanel: {
    paddingHorizontal: 15,
    paddingTop: 10,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: '#0B1220',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 5,
  },
  copilotHeader: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  copilotHeading: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  copilotStatus: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  copilotTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  copilotStatusLabel: {
    marginLeft: 2,
    fontSize: 9,
    flexShrink: 1,
  },
  copilotExpand: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantMessage: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    minHeight: 19,
  },
  transcript: {
    fontSize: 10,
    marginTop: 1,
    minHeight: 13,
  },
  voiceRow: {
    minHeight: 73,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  micButton: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  micPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.96 }],
  },
  voiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  voicePrompt: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  voiceSubtext: {
    marginTop: 4,
    fontSize: 9,
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
  },
  languagePillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
  },
  commandBox: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 5,
    borderRadius: 12,
  },
  commandInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: Platform.OS === 'web' ? 8 : 9,
    fontSize: 12,
  },
  sendButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  panelFooter: {
    minHeight: 31,
    justifyContent: 'center',
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 5,
    paddingRight: 10,
  },
  exampleChip: {
    minHeight: 25,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  exampleText: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
  },
  safetyText: {
    fontSize: 9,
    marginTop: 2,
    minHeight: 12,
  },
  collapsedCopilot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsedCopilotCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsedMicButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  collapsedStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
  },
  collapsedText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  restoreCopilotButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
  },
  restoreCopilotText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  newJourneyFloating: {
    position: 'absolute',
    top: 11,
    right: 14,
    zIndex: 4,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 9,
    opacity: 0.96,
  },
  newJourneyText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 18, 32, 0.35)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 9,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  sheetHeader: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetHeaderCopy: {
    flex: 1,
  },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  sheetSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  sheetClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flexShrink: 1,
  },
  sheetContent: {
    paddingHorizontal: 19,
    paddingTop: 14,
    paddingBottom: 24,
  },
  itineraryEndpoint: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  endpointDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
  destinationDot: {
    width: 13,
    height: 13,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
  stopTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  stopTypeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  sheetItemTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  helperText: {
    fontSize: 10,
    lineHeight: 15,
  },
  emptyStops: {
    minHeight: 51,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 11,
    marginVertical: 4,
  },
  itineraryRow: {
    minHeight: 63,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stopNumber: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  stopNumberText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  smallTextAction: {
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  actionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  editStopInput: {
    minHeight: 37,
    paddingHorizontal: 9,
  },
  manualAddRow: {
    marginTop: 13,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
  },
  input: {
    minHeight: 42,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 12,
  },
  manualInput: {
    flex: 1,
    borderWidth: 0,
  },
  addButton: {
    minHeight: 38,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 9,
  },
  addButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
  sectionEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 9,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 5,
  },
  choiceButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
  },
  choiceText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  preferenceRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  preferenceCopy: {
    flex: 1,
    gap: 3,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    minHeight: 65,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
  },
  modeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  contextRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    marginBottom: 9,
  },
  contextChip: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 9,
  },
  contextText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  candidateCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 13,
  },
  candidateIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  candidateDetails: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  candidateReason: {
    fontSize: 9,
  },
  addCandidateButton: {
    minHeight: 35,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  destinationChoice: {
    minHeight: 59,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  destinationIcon: {
    width: 33,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  destinationInput: {
    marginTop: 15,
  },
  primaryAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 11,
    borderRadius: 11,
  },
  primaryActionText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
});

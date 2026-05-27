/* Field Survey Tracker config.js */
const SUPABASE_URL = 'https://xtzlhrgxbeqiwsighhcp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0emxocmd4YmVxaXdzaWdoaGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNTMzOTksImV4cCI6MjA5MjkyOTM5OX0.NuP-bJrGbCHKUlpm3o_2aRCGxBPjgiYzdZfGkqYGySA';
// NOTE: anon key can be public only when Supabase RLS is enabled correctly.
// Admin permission must come from public.profiles.role, not from hardcoded email in frontend.
const APP_VERSION = 'v6.1.0-stability';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

let currentTab = 'partner';
let currentView = 'map';
let leafletMap = null;
let clusterGroup = null;
let markers = {};
let allData = { partner: [], customer: [] };
let editLat = null, editLng = null;
let editPhotoFile = null;
let pickingLocation = false;
let currentUser = null;
let currentUserRole = 'anonymous';
let currentUserProfile = null;
let isAdmin = false;
let dataSourceState = { partner: 'remote', customer: 'remote', message: '' };
let realtimeLoadTimer = null;
let realtimeChannel = null;
let chartPartner = null, chartCustomer = null, chartTrend = null;
let lastRemoteLoadAt = null;
let lastRemoteCounts = { partner: 0, customer: 0 };
let isSyncing = false;
let adminProfiles = [];
let adminTeams = [];

const STATUS_CONFIG = {
  partner: [
    { val: 'joined', label: '🟢 ເຂົ້າຮ່ວມ' },
    { val: 'considering', label: '🟡 ພິຈາລະນາ' },
    { val: 'not_interested', label: '🔴 ບໍ່ສົນໃຈ' }
  ],
  customer: [
    { val: 'interested', label: '🟢 ສົນໃຈ' },
    { val: 'considering', label: '🟡 ພິຈາລະນາ' },
    { val: 'not_interested', label: '🔴 ບໍ່ສົນໃຈ' }
  ]
};
const STATUS_LABELS = { joined:'ເຂົ້າຮ່ວມ', interested:'ສົນໃຈ', considering:'ພິຈາລະນາ', not_interested:'ບໍ່ສົນໃຈ' };
const MARKER_COLORS = { joined:'#1D9E75', interested:'#1D9E75', considering:'#BA7517', not_interested:'#E24B4A' };

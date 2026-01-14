import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file paths
const databaseFiles = {
    normal: {
        american: 'americanAirports.json',
        asian: 'asianAirports.json',
        european: 'europeanAirports.json',
        other: 'otherAirports.json'
    },
    emergency: {
        american: 'americanEmergencyAirports.json',
        asian: 'asianEmergencyAirports.json',
        european: 'europeanEmergencyAirports.json',
        other: 'otherEmergencyAirports.json'
    }
};

const dataPath = path.join(__dirname);

// Function to load and parse JSON file
function loadJSONFile(filename) {
    try {
        const filePath = path.join(dataPath, filename);
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        
        // Handle different file structures
        if (parsed.airports && Array.isArray(parsed.airports)) {
            return parsed.airports;
        } else if (Array.isArray(parsed)) {
            return parsed;
        } else {
            console.warn(`Unexpected structure in ${filename}`);
            return [];
        }
    } catch (error) {
        console.error(`Error loading ${filename}:`, error.message);
        return [];
    }
}

// Function to count airports in a file
function countAirports(data) {
    return Array.isArray(data) ? data.length : 0;
}

// Function to find duplicates in an array
function findDuplicates(array) {
    const seen = new Set();
    const duplicates = new Set();
    
    array.forEach(item => {
        if (seen.has(item)) {
            duplicates.add(item);
        } else {
            seen.add(item);
        }
    });
    
    return Array.from(duplicates);
}

// Main test function
function testDatabase() {
    console.log('🛩️  AIRPORT DATABASE TEST RESULTS\n');
    console.log('=' * 50);
    
    let totalNormalAirports = 0;
    let totalEmergencyAirports = 0;
    let allAirports = [];
    let allICaoCodes = [];
    let allIataCodes = [];
    
    // Test normal airports
    console.log('\n📊 NORMAL AIRPORTS COUNT:');
    console.log('-'.repeat(30));
    
    for (const [region, filename] of Object.entries(databaseFiles.normal)) {
        const data = loadJSONFile(filename);
        const count = countAirports(data);
        totalNormalAirports += count;
        
        console.log(`${region.toUpperCase()}: ${count} airports`);
        
        // Collect data for duplicate checking
        data.forEach(airport => {
            if (airport.icao) allICaoCodes.push(airport.icao);
            if (airport.iata) allIataCodes.push(airport.iata);
            allAirports.push({ ...airport, type: 'normal', region, file: filename });
        });
    }
    
    console.log(`TOTAL NORMAL AIRPORTS: ${totalNormalAirports}`);
    
    // Test emergency airports
    console.log('\n🚨 EMERGENCY AIRPORTS COUNT:');
    console.log('-'.repeat(30));
    
    for (const [region, filename] of Object.entries(databaseFiles.emergency)) {
        const data = loadJSONFile(filename);
        const count = countAirports(data);
        totalEmergencyAirports += count;
        
        console.log(`${region.toUpperCase()}: ${count} airports`);
        
        // Collect data for duplicate checking
        data.forEach(airport => {
            if (airport.icao) allICaoCodes.push(airport.icao);
            if (airport.iata) allIataCodes.push(airport.iata);
            allAirports.push({ ...airport, type: 'emergency', region, file: filename });
        });
    }
    
    console.log(`TOTAL EMERGENCY AIRPORTS: ${totalEmergencyAirports}`);
    
    // Overall totals
    console.log('\n📈 OVERALL TOTALS:');
    console.log('-'.repeat(30));
    console.log(`TOTAL AIRPORTS: ${totalNormalAirports + totalEmergencyAirports}`);
    console.log(`Normal Airports: ${totalNormalAirports}`);
    console.log(`Emergency Airports: ${totalEmergencyAirports}`);
    
    // Duplicate detection
    console.log('\n🔍 DUPLICATE DETECTION:');
    console.log('-'.repeat(30));
    
    // Check for duplicate ICAO codes
    const duplicateICaos = findDuplicates(allICaoCodes);
    if (duplicateICaos.length > 0) {
        console.log('❌ DUPLICATE ICAO CODES FOUND:');
        duplicateICaos.forEach(code => {
            const airports = allAirports.filter(a => a.icao === code);
            console.log(`  ${code} appears in ${airports.length} files:`);
            airports.forEach(airport => {
                console.log(`    - ${airport.type} (${airport.region}): ${airport.name || 'Unknown'}`);
            });
        });
    } else {
        console.log('✅ No duplicate ICAO codes found');
    }
    
    // Check for duplicate IATA codes
    const duplicateIatas = findDuplicates(allIataCodes);
    if (duplicateIatas.length > 0) {
        console.log('❌ DUPLICATE IATA CODES FOUND:');
        duplicateIatas.forEach(code => {
            const airports = allAirports.filter(a => a.iata === code);
            console.log(`  ${code} appears in ${airports.length} files:`);
            airports.forEach(airport => {
                console.log(`    - ${airport.type} (${airport.region}): ${airport.name || 'Unknown'}`);
            });
        });
    } else {
        console.log('✅ No duplicate IATA codes found');
    }
    
    // Check for airports that exist in both normal and emergency databases
    console.log('\n⚠️  CROSS-DATABASE OVERLAP CHECK:');
    console.log('-'.repeat(30));
    
    const normalAirports = allAirports.filter(a => a.type === 'normal');
    const emergencyAirports = allAirports.filter(a => a.type === 'emergency');
    
    const overlappingAirports = [];
    
    normalAirports.forEach(normal => {
        const matches = emergencyAirports.filter(emergency => 
            (normal.icao && emergency.icao === normal.icao) ||
            (normal.iata && emergency.iata === normal.iata)
        );
        
        if (matches.length > 0) {
            overlappingAirports.push({
                normal,
                emergency: matches
            });
        }
    });
    
    if (overlappingAirports.length > 0) {
        console.log('❌ AIRPORTS FOUND IN BOTH DATABASES:');
        overlappingAirports.forEach(overlap => {
            console.log(`  ${overlap.normal.iata || 'N/A'} (${overlap.normal.icao || 'N/A'}): ${overlap.normal.name}`);
            console.log(`    Normal: ${overlap.normal.region} file`);
            console.log(`    Emergency: ${overlap.emergency[0].region} file`);
        });
    } else {
        console.log('✅ No airports found in both normal and emergency databases');
    }
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('=' * 50);
    if (duplicateICaos.length === 0 && duplicateIatas.length === 0 && overlappingAirports.length === 0) {
        console.log('🎉 ALL TESTS PASSED! No duplicates found across all databases.');
    } else {
        console.log('⚠️  ISSUES FOUND: Please review the duplicates above.');
    }
    
    console.log(`\nDatabase validation complete at: ${new Date().toLocaleString()}`);
}

// Run the test
testDatabase();
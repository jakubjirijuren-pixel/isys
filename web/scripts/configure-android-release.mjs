import {readFileSync,writeFileSync} from "node:fs";
const file="android/app/build.gradle";
let s=readFileSync(file,"utf8");
if(!s.includes("android {"))throw Error("Android Gradle block not found");
const versionCode=Number(process.env.FOXA_VERSION_CODE);
const versionName=process.env.FOXA_VERSION_NAME;
if(!Number.isInteger(versionCode)||versionCode<2||!/^\d+\.\d+\.\d+$/.test(versionName||""))throw Error("Set valid FOXA_VERSION_CODE >= 2 and FOXA_VERSION_NAME x.y.z");
const code=/versionCode\s+\d+/;
const name=/versionName\s+["'][^"']+["']/;
if(!code.test(s)||!name.test(s))throw Error("Gradle version declarations not found");
s=s.replace(code,"versionCode "+versionCode).replace(name,'versionName "'+versionName+'"');
const config=`android {
    signingConfigs {
        release {
            storeFile file(System.getenv("FOXA_KEYSTORE_PATH"))
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
`;
s=s.replace("android {",config);
if(!/buildTypes\s*\{/.test(s)||!/release\s*\{/.test(s))throw Error("Release build type not found");
s=s.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{)/,'$1\n            signingConfig signingConfigs.release');
writeFileSync(file,s);
console.log("Configured release signing and version "+versionName+" ("+versionCode+")");

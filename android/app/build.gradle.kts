import java.util.Properties

plugins {
    id("com.android.application")
}

val ciStoreFile = rootProject.file("keystore/pingo-ci.jks")
val versionProps = Properties().apply {
    val f = rootProject.file("version.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
val verCode = (System.getenv("VERSION_CODE") ?: versionProps.getProperty("VERSION_CODE") ?: "1").toInt()
val verName = System.getenv("VERSION_NAME") ?: versionProps.getProperty("VERSION_NAME") ?: "1.2.0"
val webUrl = System.getenv("PINGO_WEB_URL")
    ?: versionProps.getProperty("PINGO_WEB_URL")
    ?: "https://pingo-halloween.onrender.com"

android {
    namespace = "com.pingo.halloween"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.pingo.halloween"
        minSdk = 24
        targetSdk = 35
        versionCode = verCode
        versionName = verName
        buildConfigField("String", "WEB_URL", "\"$webUrl\"")
    }

    signingConfigs {
        create("ci") {
            storeFile = ciStoreFile
            storePassword = "pingo-ci-store"
            keyAlias = "pingo"
            keyPassword = "pingo-ci-store"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("ci")
        }
        debug {
            signingConfig = signingConfigs.getByName("ci")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

// kotlin-stdlib ≥1.8 ya incluye jdk7/jdk8; versiones viejas transitivas duplican clases.
configurations.configureEach {
    exclude(group = "org.jetbrains.kotlin", module = "kotlin-stdlib-jdk7")
    exclude(group = "org.jetbrains.kotlin", module = "kotlin-stdlib-jdk8")
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("org.jetbrains.kotlin:kotlin-stdlib:1.9.24")
}

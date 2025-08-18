// app/Start.tsx
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

const dogImages = [
    { id: 1, name: "パン", image: require("../assets/images/dogs/bread.png") },
    { id: 2, name: "フライングディスク", image: require("../assets/images/dogs/flying-disk.png") },
    { id: 3, name: "かぼす", image: require("../assets/images/dogs/kabosu.png") },
    { id: 4, name: "リッキング", image: require("../assets/images/dogs/licking.png") },
];

// 撫で判定のしきい値
const SCRATCH_DISTANCE_PX = 14; // これ以上移動したら「撫でた」
const SCRATCH_COOLDOWN_MS = 60; // 連続判定の最小間隔

export default function Start() {
    // --- params 正規化（customDogUri はエンコードされて渡ってくる想定） ---
    const params = useLocalSearchParams();
    const dogIdParam = Array.isArray(params.dogId) ? params.dogId[0] : (params.dogId as string | undefined);
    const rawCustom = Array.isArray(params.customDogUri)
        ? params.customDogUri[0]
        : (params.customDogUri as string | undefined);
    const customDogUriParam = rawCustom ? decodeURIComponent(rawCustom) : undefined;

    // --- ゲーム状態 ---
    const [petCount, setPetCount] = useState(0);
    const [happiness, setHappiness] = useState(0);

    // --- アニメーション値 ---
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotationAnim = useRef(new Animated.Value(0)).current;

    // --- ジェスチャー判定用 ---
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const lastTimeRef = useRef(0);

    // --- 表示する犬の決定 ---
    const selectedDog = useMemo(() => {
        if (customDogUriParam) {
        return { id: 0, name: "自前の犬", image: { uri: customDogUriParam } as const };
        }
        const id = Number(dogIdParam || "1");
        return dogImages.find((d) => d.id === id);
    }, [customDogUriParam, dogIdParam]);

    // --- 撫で実行 ---
    const handlePet = () => {
        Animated.sequence([
        Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
            Animated.timing(rotationAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
            Animated.timing(rotationAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        ]).start();

        setPetCount((v) => v + 1);
        setHappiness((v) => Math.min(v + 1, 300));
    };

    // --- 擦りジェスチャー判定 ---
    const onPan = (event: any) => {
        const { state, x, y } = event.nativeEvent;

        if (state === State.BEGAN) {
        lastPosRef.current = { x, y };
        lastTimeRef.current = Date.now();
        return;
        }

        if (state === State.ACTIVE && lastPosRef.current) {
        const dx = x - lastPosRef.current.x;
        const dy = y - lastPosRef.current.y;
        const dist = Math.hypot(dx, dy);
        const now = Date.now();

        if (dist >= SCRATCH_DISTANCE_PX && now - lastTimeRef.current >= SCRATCH_COOLDOWN_MS) {
            handlePet();
            lastPosRef.current = { x, y };
            lastTimeRef.current = now;
        }
        return;
        }

        if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
        lastPosRef.current = null;
        }
    };

    const getHappinessMessage = () => {
        if (happiness >= 250) return "とても幸せです！";
        if (happiness >= 150) return "とても嬉しそうです！";
        if (happiness >= 90) return "気持ちよさそうです！";
        if (happiness >= 40) return "少し嬉しそうです！";
        return "撫でてあげてください！";
    };

    const spin = rotationAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "10deg"] });

    return (
        <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
            {/* 背景はの直下に絶対配置（画面いっぱい） */}
            <Image
                source={require("../assets/images/flower.png")}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                pointerEvents="none"
            />

            <Text style={styles.title}>{selectedDog?.name}と遊ぼう！</Text>

            {/* 犬（擦ると撫で判定） */}
            <PanGestureHandler
            onGestureEvent={onPan}
            onHandlerStateChange={onPan}
            minDist={2}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
            <Animated.View style={[styles.dogContainer, { transform: [{ scale: scaleAnim }, { rotate: spin }] }]}>
                {selectedDog?.image ? (
                <Image
                    source={selectedDog.image as any}
                    style={styles.dogImage}
                    contentFit="contain" // expo-image
                    onError={() => {
                    // ここに来たらURI不正の可能性（Choose側で安定URI化を検討）
                    }}
                />
                ) : (
                <View style={[styles.dogImage, styles.loadingBox]}>
                    <Text>画像を読み込み中...</Text>
                </View>
                )}
            </Animated.View>
            </PanGestureHandler>

            {/* 統計 */}
            <View style={styles.statsContainer}>
            <View className="statItem" style={styles.statItem}>
                <Text style={styles.statLabel}>撫でた回数</Text>
                <Text style={styles.statValue}>{petCount}</Text>
            </View>

            <View style={styles.statItem}>
                <Text style={styles.statLabel}>幸福度</Text>
                <View style={styles.happinessBar}>
                <View style={[styles.happinessFill, { width: `${happiness}%` }]} />
                </View>
                <Text style={styles.happinessText}>{happiness}%</Text>
            </View>
            </View>

            <View style={styles.messageContainer}>
            <Text style={styles.message}>{getHappinessMessage()}</Text>
            </View>

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>戻る</Text>
            </TouchableOpacity>
        </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#87CEEB" },
    container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
    title: { 
        fontSize: 28, 
        fontWeight: "bold", 
        color: "black", 
        marginBottom: 40, 
        textAlign: "center",
        backgroundColor: "ivory",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    dogContainer: { alignItems: "center", marginBottom: 40 },
    dogImage: { width: 220, height: 220 },
    loadingBox: { backgroundColor: "#e0e0e0", justifyContent: "center", alignItems: "center" },
    statsContainer: { width: "100%", marginBottom: 30 },
    statItem: { alignItems: "center", marginBottom: 20 },
    statLabel: { fontSize: 16, fontWeight: "600", color: "#666", marginBottom: 5 },
    statValue: { fontSize: 24, fontWeight: "bold", color: "#007AFF" },
    happinessBar: { width: 220, height: 20, backgroundColor: "#e0e0e0", borderRadius: 10, overflow: "hidden", marginBottom: 5 },
    happinessFill: { height: "100%", backgroundColor: "#FFD700", borderRadius: 10 },
    happinessText: { fontSize: 16, fontWeight: "600", color: "#FFD700" },
    messageContainer: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 15,
        marginBottom: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    message: { fontSize: 18, fontWeight: "600", color: "#333", textAlign: "center" },
    backButton: { backgroundColor: "#007AFF", paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
    backButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
    flowerBackground: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", zIndex: -1 },
});

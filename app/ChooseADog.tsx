import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Col, Grid } from "react-native-easy-grid";
import { SafeAreaView } from "react-native-safe-area-context";

const dogImages = [
  { id: 1, name: "パン", image: require("../assets/images/dogs/bread.png") },
  { id: 2, name: "フライングディスク", image: require("../assets/images/dogs/flying-disk.png") },
  { id: 3, name: "かぼす", image: require("../assets/images/dogs/kabosu.png") },
  { id: 4, name: "リッキング", image: require("../assets/images/dogs/licking.png") },
];

export default function ChooseADog() {
  // 選択されたプリセット犬のID（null = 未選択）
  const [selectedDog, setSelectedDog] = useState<number | null>(null);
  // カメラロールから選択された画像のURI（null = 未選択）
  const [customDogUri, setCustomDogUri] = useState<string | null>(null);

  // プリセット犬を選択した時の処理
  const handleDogSelect = (dogId: number) => {
    setSelectedDog(dogId);                    // 選択された犬のIDを保存
    setCustomDogUri(null);                    // カスタム犬の選択をリセット
    router.push(`/Start?dogId=${dogId}`);     // Start画面に遷移（dogIdパラメータ付き）
  };

    // 画像URIの正規化関数（Android/iOSの違いを吸収して安定したURIに変換）
  // 用途：カメラロールから選択した画像を、アプリ内で確実に表示できるようにする
  async function normalizePickedUri(asset: {
    uri: string;           // 元の画像URI
    fileName?: string | null;  // ファイル名（あれば）
    assetId?: string | null;   // メディアライブラリのアセットID（あれば）
  }) {
    let src = asset.uri;  // 処理対象のURI

    try {
      // ステップ1: ファイルの存在確認とURIの修正
      const info = await FileSystem.getInfoAsync(src);
      if (!info.exists || src.startsWith("content://")) {
        // ファイルが存在しない、またはcontent://URIの場合
        if (asset.assetId) {
          // MediaLibraryから正しいURIを取得
          const ainfo = await MediaLibrary.getAssetInfoAsync(asset.assetId);
          if (ainfo.localUri) src = ainfo.localUri;
        }
      }

      // ステップ2: 安全なファイル名の生成
      const safeName = (
        asset.fileName ??                    // 元のファイル名があれば使用
        src.split("/").pop() ??              // なければURIから抽出
        `picked-${Date.now()}.jpg`           // それもなければタイムスタンプ付きで生成
      ).replace(/[^\w.-]/g, "_");            // 特殊文字をアンダースコアに置換

      // ステップ3: アプリのキャッシュディレクトリにコピー
      const destDir = FileSystem.cacheDirectory + "picked/";
      try { 
        await FileSystem.makeDirectoryAsync(destDir, { intermediates: true }); 
      } catch {}  // ディレクトリが既に存在する場合は無視

      const dest = destDir + safeName;  // コピー先の完全パス

      // ステップ4: ファイルをコピー
      await FileSystem.copyAsync({ from: src, to: dest });

      return dest;  // 安定したURIを返す（file://.../picked/xxx.jpg）
    } catch (e) {
      console.warn("normalizePickedUri failed", e);
      return src;  // 失敗時は元のURIを返す（フォールバック）
    }
  }


  const handleCameraRollSelect = async () => {
    // 1) 権限（iOSの“限定”にも注意）
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alert("写真へのアクセス権限が必要です。設定から許可してください。");
      return;
    }

          // 2) ピッカー起動（画像限定・正方形トリミング可）
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        selectionLimit: 1, // 一枚のみOK
        // ファイルの永続化を試行
        allowsMultipleSelection: false,
      });

         // 3) 結果反映
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const stableUri = await normalizePickedUri({
          uri: asset.uri,
          fileName: asset.fileName,
          assetId: (asset as any).assetId, // ImagePickerの型にないことがあるのでanyで
        });
        setCustomDogUri(stableUri);
        setSelectedDog(null);
      }
    };

  // カスタム犬で遊ぶ処理（選択された写真の犬とStart画面に遷移）
  const handleCustomDogPlay = () => {
    if (customDogUri) {
      router.push({
        pathname: "/Start",
        params: { customDogUri: encodeURIComponent(customDogUri!) },  // URIをエンコードしてパラメータとして渡す
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 画面タイトル */}
        <Text style={styles.title}>犬を選んでください</Text>

        {/* カメラロール選択ボタン */}
        <TouchableOpacity style={styles.cameraRollButton} onPress={handleCameraRollSelect}>
          <Text style={styles.cameraRollButtonText}>📷 カメラロールから選択</Text>
        </TouchableOpacity>

        {/* カスタム犬のプレビュー（写真が選択された場合のみ表示） */}
        {customDogUri && (
          <View style={styles.customDogContainer}>
            <Text style={styles.customDogTitle}>選択された写真</Text>
            <Image source={{ uri: customDogUri }} style={styles.customDogImage} />
            <TouchableOpacity style={styles.playButton} onPress={handleCustomDogPlay}>
              <Text style={styles.playButtonText}>この犬と遊ぶ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* プリセット犬のセクション */}
        <Text style={styles.presetTitle}>プリセットの犬</Text>

        {/* プリセット犬のグリッド表示 */}
        <Grid>
          <Col>
            {dogImages.map((dog) => (
              <TouchableOpacity
                key={dog.id}
                style={[styles.dogCard, selectedDog === dog.id && styles.selectedDogCard]}
                onPress={() => handleDogSelect(dog.id)}
              >
                <Image source={dog.image} style={styles.dogImage} />
                <Text style={styles.dogName}>{dog.name}</Text>
              </TouchableOpacity>
            ))}
          </Col>
        </Grid>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  dogCard: {
    flex: 0.48,
    backgroundColor: 'white',
    padding: 10,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    elevation: 5,
  },
  selectedDogCard: {
    borderWidth: 3,
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  dogImage: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  dogName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  selectedInfo: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  selectedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraRollButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
    alignItems: 'center',
  },
  cameraRollButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customDogContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    elevation: 5,
  },
  customDogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  customDogImage: {
    width: 150,
    height: 150,
    marginBottom: 15,
  },
  playButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  playButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  presetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
});
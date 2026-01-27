import OutlinedButton from "@/components/outlined_btn";
import P from "@/components/p";
import { style } from "@/styles/forgot-password";
import assets from "@/utils/assets";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={style.container}>
      <P weight="semiBold" size={30}>
        Reset password
      </P>
      <Image source={assets.student} style={style.image} />
      <P
        weight="medium"
        size={20}
        color="#3C3C4399"
        style={{ textAlign: "center" }}
      >
        Currently you cannot reset your password by yourself
      </P>
      <P
        weight="medium"
        size={12}
        color="#3C3C4399"
        style={{ textAlign: "center" }}
      >
        Contact your administration to reset your password.
      </P>
      <OutlinedButton
        onPress={() => {
          router.push("/");
        }}
      >
        Back to sign in
      </OutlinedButton>
    </SafeAreaView>
  );
}

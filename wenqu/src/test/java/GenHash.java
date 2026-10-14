import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenHash {
    public static void main(String[] args) {
        // 输出 "" 对应的真实 BCrypt 哈希
        System.out.println(new BCryptPasswordEncoder().encode("wenqu@123"));
    }
}
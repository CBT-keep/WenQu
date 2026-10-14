package xyz.cbt.wenqu.backend;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("xyz.cbt.wenqu.backend.mapper")
public class WenquApplication {

	public static void main(String[] args) {
		SpringApplication.run(WenquApplication.class, args);
	}

}

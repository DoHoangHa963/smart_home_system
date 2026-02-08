package com.example.smart_home_system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SmartHomeSystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(SmartHomeSystemApplication.class, args);
	}

}

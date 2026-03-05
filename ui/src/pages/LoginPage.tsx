import { Card, Text, Flex } from "@mantine/core";
import { LoginForm } from "@forms/login/LoginForm";

export default function LoginPage() {
  return (
    <Flex
      className="w-full h-full min-h-screen bg-(--bg-base)"
      align="center"
      justify="center"
    >
      <Card
        className="w-full max-w-125 min-h-75 bg-(--bg-elevated)!"
        padding="lg"
        radius="md"
        shadow="sm"
        withBorder
      >
        <Flex justify="center">
          <Text
            className="text-(--text-primary)!"
            fw={700}
            size="xl"
            mb={18}
            mt={40}
          >
            Log In
          </Text>
        </Flex>

        <LoginForm />
      </Card>
    </Flex>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmailVerified() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <Card className="max-w-md text-center shadow-elegant">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-green-600">
            ✅ Email Verified!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Your email address has been successfully verified. You can now log in to your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

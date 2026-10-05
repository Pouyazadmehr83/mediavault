from rest_framework.generics import CreateAPIView, RetrieveAPIView
from .serializers import RegisterSerializer, MeSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated


class RegisterView(CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer



class MeView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user
    
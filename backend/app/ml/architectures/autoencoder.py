import torch
import torch.nn as nn
from typing import Tuple

class ConvAutoencoder(nn.Module):
    """
    Industrial Acoustic Convolutional Autoencoder.
    - Input: Log-Mel spectrogram patch of shape (B, 1, 128, 64)
    - Latent Bottleneck: 64-dimensional feature embedding
    - Output: Reconstructed spectrogram of shape (B, 1, 128, 64)
    """
    def __init__(self, latent_dim: int = 64):
        super(ConvAutoencoder, self).__init__()
        self.latent_dim = latent_dim

        # Encoder: 1x128x64 -> 256x8x4
        self.encoder_conv = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, stride=2, padding=1),  # 32x64x32
            nn.BatchNorm2d(32),
            nn.LeakyReLU(0.2, inplace=True),

            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),  # 64x32x16
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2, inplace=True),

            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),  # 128x16x8
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2, inplace=True),

            nn.Conv2d(128, 256, kernel_size=3, stride=2, padding=1),  # 256x8x4
            nn.BatchNorm2d(256),
            nn.LeakyReLU(0.2, inplace=True),
        )

        self.flatten_dim = 256 * 8 * 4  # 8192
        self.fc_enc = nn.Linear(self.flatten_dim, latent_dim)
        self.fc_dec = nn.Linear(latent_dim, self.flatten_dim)

        # Decoder: 256x8x4 -> 1x128x64
        self.decoder_conv = nn.Sequential(
            nn.ConvTranspose2d(256, 128, kernel_size=4, stride=2, padding=1),  # 128x16x8
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2, inplace=True),

            nn.ConvTranspose2d(128, 64, kernel_size=4, stride=2, padding=1),  # 64x32x16
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2, inplace=True),

            nn.ConvTranspose2d(64, 32, kernel_size=4, stride=2, padding=1),  # 32x64x32
            nn.BatchNorm2d(32),
            nn.LeakyReLU(0.2, inplace=True),

            nn.ConvTranspose2d(32, 1, kernel_size=4, stride=2, padding=1),  # 1x128x64
            nn.Sigmoid(),  # Bound output to [0, 1] matching normalized log-mel
        )

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        """Extracts latent bottleneck embedding representation."""
        h = self.encoder_conv(x)
        h = h.view(h.size(0), -1)
        z = self.fc_enc(h)
        return z

    def decode(self, z: torch.Tensor) -> torch.Tensor:
        """Reconstructs spectrogram patch from latent representation."""
        h = self.fc_dec(z)
        h = h.view(h.size(0), 256, 8, 4)
        x_recon = self.decoder_conv(h)
        return x_recon

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        z = self.encode(x)
        x_recon = self.decode(z)
        return x_recon, z

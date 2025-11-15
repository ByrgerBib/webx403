"""Tests for Python client"""
import pytest
from webx403_client import WebX403Client

def test_client_creation():
    """Test client can be created"""
    from solana.keypair import Keypair
    keypair = Keypair.generate()
    client = WebX403Client(keypair)
    assert client.address is not None

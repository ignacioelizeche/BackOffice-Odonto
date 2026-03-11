#!/usr/bin/env python3
"""
Test script for N8N Calendar Workflows
Verifies the entire flow works correctly
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:8000"
N8N_URL = "http://localhost:5678"
BACKEND_TOKEN = "YOUR_BACKEND_TOKEN"  # Replace with real token
N8N_WEBHOOK_URL = "https://your-n8n-instance/webhook/create-doctor-calendar"  # Replace

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.YELLOW}→ {text}{Colors.END}")

def test_backend_connection():
    """Test backend is running"""
    print_header("1. Testing Backend Connection")
    try:
        response = requests.get(f"{BACKEND_URL}/health")
        if response.status_code == 200:
            print_success(f"Backend is running: {response.json()}")
            return True
        else:
            print_error(f"Backend returned: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Cannot connect to backend: {e}")
        return False

def test_n8n_connection():
    """Test N8N is running"""
    print_header("2. Testing N8N Connection")
    try:
        response = requests.get(f"{N8N_URL}/api/active")
        if response.status_code == 200:
            print_success("N8N is running")
            return True
        else:
            print_error(f"N8N returned: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Cannot connect to N8N: {e}")
        return False

def create_test_doctor():
    """Create a test doctor"""
    print_header("3. Creating Test Doctor")

    doctor_data = {
        "name": f"Test Doctor {datetime.now().strftime('%H%M%S')}",
        "email": f"test.doctor.{datetime.now().strftime('%H%M%S')}@test.com",
        "phone": "555-1234",
        "specialty": "Odontología General",
        "licenseNumber": f"LIC{datetime.now().strftime('%H%M%S')}",
        "yearsExperience": 5
    }

    try:
        headers = {
            "Authorization": f"Bearer {BACKEND_TOKEN}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            f"{BACKEND_URL}/api/doctores",
            json=doctor_data,
            headers=headers,
            timeout=10
        )

        if response.status_code in [200, 201]:
            doctor = response.json()
            print_success(f"Doctor created: {doctor['name']} (ID: {doctor['id']})")
            print_info(f"Email: {doctor['email']}")
            return doctor
        else:
            print_error(f"Failed to create doctor: {response.status_code}")
            print_info(f"Response: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error creating doctor: {e}")
        return None

def check_calendar_status(doctor_id):
    """Check if calendar was created"""
    print_header("4. Checking Calendar Status")

    time.sleep(3)  # Wait for N8N to process
    print_info("Waiting for N8N webhook to process...")

    try:
        headers = {"Authorization": f"Bearer {BACKEND_TOKEN}"}
        response = requests.get(
            f"{BACKEND_URL}/api/calendar/doctor/{doctor_id}/status",
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            status = response.json()
            print_success(f"Calendar Status: {json.dumps(status, indent=2)}")

            if status.get("calendar_configured"):
                print_success(f"Calendar created: {status['calendar_id']}")
                return True
            else:
                print_error("Calendar not yet configured. Check N8N logs.")
                return False
        else:
            print_error(f"Failed to get calendar status: {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Error checking calendar status: {e}")
        return False

def test_webhook():
    """Test N8N webhook directly"""
    print_header("5. Testing N8N Webhook Directly")

    test_payload = {
        "doctor_id": 999,
        "doctor_name": "Test Doctor",
        "doctor_email": "test@example.com",
        "empresa_id": 1,
        "webhook_url": "http://localhost:8000/api/calendar/doctor-calendar-created"
    }

    print_info(f"Sending test payload to: {N8N_WEBHOOK_URL}")
    print_info(f"Payload: {json.dumps(test_payload, indent=2)}")

    try:
        response = requests.post(
            N8N_WEBHOOK_URL,
            json=test_payload,
            timeout=30
        )
        print_info(f"N8N Response: {response.status_code}")
        if response.text:
            print_info(f"Body: {response.text}")

        if response.status_code in [200, 201]:
            print_success("Webhook test successful")
            return True
        else:
            print_error(f"Webhook returned error: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error testing webhook: {e}")
        print_info("Make sure N8N_WEBHOOK_URL is correct and webhook is active")
        return False

def test_doctor_endpoint():
    """Test doctor endpoint returns calendar_id"""
    print_header("6. Testing Doctor Endpoint")

    try:
        headers = {"Authorization": f"Bearer {BACKEND_TOKEN}"}
        response = requests.get(
            f"{BACKEND_URL}/api/doctores/1",
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            doctor = response.json()
            print_success("Doctor endpoint works")
            print_info(f"Doctor: {doctor['name']}")
            if doctor.get('google_calendar_id'):
                print_success(f"Calendar ID: {doctor['google_calendar_id']}")
            else:
                print_info("Calendar ID not yet set")
            return doctor
        else:
            print_error(f"Failed to get doctor: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Error getting doctor: {e}")
        return None

def main():
    print(f"\n{Colors.BLUE}╔{'='*58}╗{Colors.END}")
    print(f"{Colors.BLUE}║  N8N Calendar Integration - Test Suite              ║{Colors.END}")
    print(f"{Colors.BLUE}╚{'='*58}╝{Colors.END}\n")

    # Check configuration
    if BACKEND_TOKEN == "YOUR_BACKEND_TOKEN":
        print_error("Please set BACKEND_TOKEN in this script")
        sys.exit(1)

    if N8N_WEBHOOK_URL == "https://your-n8n-instance/webhook/create-doctor-calendar":
        print_error("Please set N8N_WEBHOOK_URL in this script")
        sys.exit(1)

    # Run tests
    tests = [
        ("Backend Connection", test_backend_connection),
        ("N8N Connection", test_n8n_connection),
        ("Webhook Test", test_webhook),
        ("Doctor Endpoint", test_doctor_endpoint),
    ]

    results = {}
    for name, test_func in tests:
        try:
            results[name] = test_func()
        except Exception as e:
            print_error(f"Unexpected error in {name}: {e}")
            results[name] = False

    # Create doctor and check calendar (only if basics work)
    if results.get("Backend Connection") and results.get("N8N Connection"):
        doctor = create_test_doctor()
        if doctor:
            calendar_created = check_calendar_status(doctor['id'])
            results["Calendar Creation"] = calendar_created

    # Summary
    print_header("Test Summary")
    for test_name, result in results.items():
        status = f"{Colors.GREEN}PASS{Colors.END}" if result else f"{Colors.RED}FAIL{Colors.END}"
        print(f"  {test_name}: {status}")

    # Final verdict
    passed = sum(1 for r in results.values() if r)
    total = len(results)

    if passed == total:
        print_success(f"All {total} tests passed!")
        return 0
    else:
        print_error(f"Only {passed}/{total} tests passed")
        return 1

if __name__ == "__main__":
    sys.exit(main())

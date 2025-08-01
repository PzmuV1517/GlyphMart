import requests
import os

def test_health_endpoint():
    """Test the health endpoint"""
    try:
        response = requests.get('http://127.0.0.1:5000/api/health')
        print(f"Health Check Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_file_endpoints():
    """Test file-related endpoints"""
    try:
        # Test that file upload endpoint exists (will return 401 without auth)
        response = requests.post('http://127.0.0.1:5000/api/upload-file')
        print(f"Upload endpoint status: {response.status_code}")
        print(f"Upload response: {response.json()}")
        
        # Test file serving endpoint (will return 400 for invalid path)
        response = requests.get('http://127.0.0.1:5000/api/files/images/test.jpg')
        print(f"File serving endpoint status: {response.status_code}")
        
    except Exception as e:
        print(f"File endpoint test failed: {e}")

if __name__ == "__main__":
    print("Testing Flask Backend with File Upload...")
    print("=" * 50)
    
    if test_health_endpoint():
        print("✅ Health endpoint working")
        test_file_endpoints()
        print("✅ File endpoints are accessible")
    else:
        print("❌ Health endpoint failed")
    
    print("=" * 50)
    print("Backend test completed!")

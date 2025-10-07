#!/usr/bin/env python3
"""
Installation test script for Highlights Expert bot
Validates dependencies and core functionality
"""

import sys
import os
import importlib
from pathlib import Path

def test_python_version():
    """Test Python version compatibility"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required")
        return False
    print(f"✅ Python {sys.version.split()[0]}")
    return True

def test_dependencies():
    """Test required dependencies"""
    required_packages = [
        'cv2',
        'numpy',
        'scipy',
        'yaml',
        'requests',
        'PIL',
        'sklearn',
        'matplotlib'
    ]

    optional_packages = [
        ('ultralytics', 'YOLOv8 for enhanced detection'),
        ('librosa', 'Advanced audio analysis'),
        ('moviepy', 'Alternative video processing')
    ]

    missing_required = []
    missing_optional = []

    print("\n🔍 Testing Required Dependencies:")
    for package in required_packages:
        try:
            importlib.import_module(package)
            print(f"   ✅ {package}")
        except ImportError:
            print(f"   ❌ {package}")
            missing_required.append(package)

    print("\n🔍 Testing Optional Dependencies:")
    for package, description in optional_packages:
        try:
            importlib.import_module(package)
            print(f"   ✅ {package} - {description}")
        except ImportError:
            print(f"   ⚠️  {package} - {description} (optional)")
            missing_optional.append(package)

    if missing_required:
        print(f"\n❌ Missing required packages: {', '.join(missing_required)}")
        print("   Run: pip install -r requirements.txt")
        return False

    return True

def test_ffmpeg():
    """Test FFmpeg availability"""
    import subprocess
    try:
        result = subprocess.run(['ffmpeg', '-version'],
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            print(f"✅ FFmpeg: {version_line}")
            return True
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    print("❌ FFmpeg not found or not accessible")
    print("   Install from: https://ffmpeg.org/download.html")
    return False

def test_directory_structure():
    """Test directory structure"""
    required_dirs = ['in', 'out/clips', 'out/renders', 'assets', 'tmp', 'logs']
    missing_dirs = []

    print("\n🔍 Testing Directory Structure:")
    for dir_path in required_dirs:
        path = Path(dir_path)
        if path.exists():
            print(f"   ✅ {dir_path}/")
        else:
            print(f"   ❌ {dir_path}/")
            missing_dirs.append(dir_path)

    if missing_dirs:
        print(f"\nCreating missing directories...")
        for dir_path in missing_dirs:
            Path(dir_path).mkdir(parents=True, exist_ok=True)
            print(f"   ✅ Created {dir_path}/")

    return True

def test_config_file():
    """Test config file"""
    config_path = Path('config.yaml')
    if not config_path.exists():
        print("❌ config.yaml not found")
        return False

    try:
        import yaml
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)

        required_sections = ['match', 'render', 'padding', 'zoom', 'detection']
        missing_sections = [s for s in required_sections if s not in config]

        if missing_sections:
            print(f"❌ Config missing sections: {', '.join(missing_sections)}")
            return False

        print("✅ config.yaml valid")
        return True

    except Exception as e:
        print(f"❌ Config file error: {str(e)}")
        return False

def test_core_modules():
    """Test core module imports"""
    print("\n🔍 Testing Core Modules:")
    modules = ['util', 'edl', 'detect', 'edit', 'main']

    for module in modules:
        try:
            importlib.import_module(module)
            print(f"   ✅ {module}.py")
        except ImportError as e:
            print(f"   ❌ {module}.py - {str(e)}")
            return False

    return True

def test_sample_data():
    """Test sample data availability"""
    print("\n🔍 Testing Sample Data:")
    sample_events = Path('samples/sample_events.json')

    if sample_events.exists():
        try:
            import json
            with open(sample_events, 'r') as f:
                events = json.load(f)

            if isinstance(events, list) and len(events) > 0:
                print(f"   ✅ Sample events ({len(events)} events)")
                return True
            else:
                print("   ❌ Sample events file invalid")
        except Exception as e:
            print(f"   ❌ Sample events error: {str(e)}")
    else:
        print("   ❌ samples/sample_events.json not found")

    return False

def main():
    """Run all tests"""
    print("🎬 Highlights Expert Bot - Installation Test")
    print("=" * 50)

    tests = [
        ("Python Version", test_python_version),
        ("Dependencies", test_dependencies),
        ("FFmpeg", test_ffmpeg),
        ("Directory Structure", test_directory_structure),
        ("Configuration", test_config_file),
        ("Core Modules", test_core_modules),
        ("Sample Data", test_sample_data)
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        print(f"\n🧪 {test_name}:")
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"   💥 Test error: {str(e)}")
            failed += 1

    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed} passed, {failed} failed")

    if failed == 0:
        print("🎉 All tests passed! Bot is ready to use.")
        print("\n🚀 Quick start:")
        print("   python main.py --match in/match.mp4 --events in/events.json")
        return 0
    else:
        print("⚠️  Some tests failed. Please fix issues before using the bot.")
        return 1

if __name__ == '__main__':
    exit(main())
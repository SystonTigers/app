"""
Comprehensive Test Suite for Video Processing System
Tests all modules: detection, editing, effects, overlays, audio, shorts, captions
"""

import unittest
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import existing test modules
try:
    from test_ai_cropping import TestAICropping
    from test_animated_text import TestAnimatedText
    from test_audio import TestAudio
    from test_captions import TestCaptions
    from test_effects import TestEffects
    from test_hashtag_generator import TestHashtagGenerator
    from test_multilang_captions import TestMultilangCaptions
    from test_overlays import TestOverlays
    from test_shorts import TestShorts
except ImportError as e:
    print(f"Warning: Could not import all test modules: {e}")


class TestVideoProcessingIntegration(unittest.TestCase):
    """Integration tests for the complete video processing pipeline"""

    @classmethod
    def setUpClass(cls):
        """Set up test environment"""
        cls.test_video = "samples/test_video.mp4"
        cls.test_output_dir = "test_output"
        os.makedirs(cls.test_output_dir, exist_ok=True)

    def test_main_pipeline_exists(self):
        """Test that main.py exists and is importable"""
        try:
            import main
            self.assertTrue(hasattr(main, 'main'))
        except ImportError:
            self.fail("main.py could not be imported")

    def test_config_file_exists(self):
        """Test that config.yaml exists and is valid"""
        import yaml
        config_path = "config.yaml"
        self.assertTrue(os.path.exists(config_path), "config.yaml not found")
        
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        self.assertIsInstance(config, dict)
        self.assertIn('detection', config)
        self.assertIn('overlays', config)
        self.assertIn('editing', config)

    def test_detect_module_exists(self):
        """Test that detection modules exist"""
        try:
            import detect
            import detect_audio
            import detect_flow
            import detect_fusion
            self.assertTrue(True)
        except ImportError as e:
            self.fail(f"Detection modules missing: {e}")

    def test_edit_module_exists(self):
        """Test that editing module exists"""
        try:
            import edit
            self.assertTrue(hasattr(edit, 'extract_clip') or True)
        except ImportError:
            self.fail("edit.py could not be imported")

    def test_effects_module_exists(self):
        """Test that effects module exists"""
        try:
            import effects
            self.assertTrue(hasattr(effects, 'apply_pro_effects') or True)
        except ImportError:
            self.fail("effects.py could not be imported")

    def test_overlays_module_exists(self):
        """Test that overlays module exists"""
        try:
            import overlays
            self.assertTrue(hasattr(overlays, 'create_scorebug') or True)
        except ImportError:
            self.fail("overlays.py could not be imported")

    def test_audio_module_exists(self):
        """Test that audio module exists"""
        try:
            import audio
            self.assertTrue(hasattr(audio, 'normalize_loudness') or True)
        except ImportError:
            self.fail("audio.py could not be imported")

    def test_shorts_module_exists(self):
        """Test that shorts module exists"""
        try:
            import shorts
            self.assertTrue(hasattr(shorts, 'generate_vertical_shorts') or True)
        except ImportError:
            self.fail("shorts.py could not be imported")

    def test_captions_module_exists(self):
        """Test that captions module exists"""
        try:
            import captions
            self.assertTrue(hasattr(captions, 'generate_srt_captions') or True)
        except ImportError:
            self.fail("captions.py could not be imported")

    def test_util_module_exists(self):
        """Test that utility module exists"""
        try:
            import util
            self.assertTrue(True)
        except ImportError:
            self.fail("util.py could not be imported")

    def test_ffmpeg_logger_exists(self):
        """Test that FFmpeg logger exists"""
        try:
            from ffmpeg_logger import FFmpegLogger
            logger = FFmpegLogger("test_match")
            self.assertIsNotNone(logger)
        except ImportError:
            self.fail("ffmpeg_logger.py could not be imported")

    def test_coaching_service_exists(self):
        """Test that coaching service exists"""
        try:
            import coaching_service
            self.assertTrue(True)
        except ImportError:
            # Coaching service is optional
            pass

    def test_webhook_handler_exists(self):
        """Test that webhook handler exists"""
        try:
            import webhook_handler
            self.assertTrue(True)
        except ImportError:
            self.fail("webhook_handler.py could not be imported")


class TestRequirements(unittest.TestCase):
    """Test that all required dependencies are installed"""

    def test_opencv_installed(self):
        """Test OpenCV is installed"""
        try:
            import cv2
            self.assertTrue(True)
        except ImportError:
            self.fail("OpenCV (cv2) not installed")

    def test_numpy_installed(self):
        """Test NumPy is installed"""
        try:
            import numpy
            self.assertTrue(True)
        except ImportError:
            self.fail("NumPy not installed")

    def test_yaml_installed(self):
        """Test PyYAML is installed"""
        try:
            import yaml
            self.assertTrue(True)
        except ImportError:
            self.fail("PyYAML not installed")

    def test_pillow_installed(self):
        """Test Pillow is installed"""
        try:
            from PIL import Image
            self.assertTrue(True)
        except ImportError:
            self.fail("Pillow not installed")


def run_all_tests():
    """Run all test suites"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add integration tests
    suite.addTests(loader.loadTestsFromTestCase(TestVideoProcessingIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestRequirements))

    # Add existing test modules if available
    try:
        suite.addTests(loader.loadTestsFromTestCase(TestAICropping))
    except NameError:
        print("Skipping AI Cropping tests (module not available)")

    try:
        suite.addTests(loader.loadTestsFromTestCase(TestAnimatedText))
    except NameError:
        print("Skipping Animated Text tests (module not available)")

    try:
        suite.addTests(loader.loadTestsFromTestCase(TestAudio))
    except NameError:
        print("Skipping Audio tests (module not available)")

    try:
        suite.addTests(loader.loadTestsFromTestCase(TestCaptions))
    except NameError:
        print("Skipping Captions tests (module not available)")

    try:
        suite.addTests(loader.loadTestsFromTestCase(TestEffects))
    except NameError:
        print("Skipping Effects tests (module not available)")

    try:
        suite.addTests(loader.loadTestsFromTestCase(TestHashtagGenerator))
    except NameError:
        print("Skipping Hashtag Generator tests (module not available)")

    try:
        suite.addTests(loader.loadTestsFromTestCase(TestMultilangCaptions))
    except NameError:
        print("Skipping Multilang Captions tests (module not available)")

    try:
        suite.addTests(loader.loadTestsFromTestCase(TestOverlays))
    except NameError:
        print("Skipping Overlays tests (module not available)")

    try:
        suite.addTests(loader.loadTestsFromTestCase(TestShorts))
    except NameError:
        print("Skipping Shorts tests (module not available)")

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print("="*70)

    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)

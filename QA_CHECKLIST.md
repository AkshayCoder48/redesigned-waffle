# AI-MAOS Unified Implementation - Manual QA Checklist

## Overview
This checklist covers the comprehensive validation of the unified implementation combining all requested features into a single cohesive build.

## Test Environment Setup
- [ ] Browser: Chrome 102+ or Safari 15.2+ (required for OPFS)
- [ ] Local inference server: Ollama running on localhost:11434 (optional, for local inference tests)
- [ ] Test files: Sample GGUF/Safetensors models for upload testing
- [ ] Network: OpenAI-compatible API accessible (for cloud tests)

---

## 1. Chat Streaming with OpenAI-Compatible APIs

### 1.1 Request Flow Validation
- [ ] **Chat Completions**: Send a message and verify streaming response appears token-by-token
- [ ] **Auth Token Handling**: Test with and without API key - Authorization header should only be sent when key provided
- [ ] **Base URL Configuration**: Verify requests go to configured base URL, not hardcoded endpoints
- [ ] **Stream Mode**: Confirm `stream: true` is always used for chat completions

### 1.2 Provider Template Configuration
- [ ] Navigate to Settings → Providers
- [ ] Add a new OpenAI-compatible provider with custom base URL
- [ ] Verify the provider appears in the provider list
- [ ] Select the new provider and verify it becomes active
- [ ] Send a chat message and verify response comes from the correct provider

### 1.3 Error Handling
- [ ] Test with invalid API key - should show authentication error
- [ ] Test with invalid base URL - should show connection error
- [ ] Test with unsupported endpoint - should show appropriate error message

---

## 2. Image Generation

### 2.1 Image Model Selection
- [ ] Navigate to Settings → Upload tab
- [ ] Verify Image Generation Model section is visible
- [ ] Select a different image model (e.g., "GPT Image 1 Mini")
- [ ] Verify selection is visually highlighted
- [ ] Close settings and verify selection persists (check localStorage)

### 2.2 Image Generation Flow
- [ ] Type "generate an image of a sunset over mountains"
- [ ] Verify image generation initiates (agent status changes)
- [ ] Wait for image generation to complete
- [ ] Verify image displays in chat with proper rendering
- [ ] Verify no placeholder or scaffolding text appears

### 2.3 Image Model Independence
- [ ] Select Flux Schnell as image model
- [ ] Generate an image
- [ ] Select GPT Image as image model
- [ ] Generate another image
- [ ] Verify the images are generated using respective models

---

## 3. Text-to-Speech (TTS)

### 3.1 TTS Model and Voice Selection
- [ ] Navigate to Settings → Upload tab
- [ ] Verify TTS Settings section is visible
- [ ] Select TTS model (e.g., "TTS 1 HD")
- [ ] Select TTS voice (e.g., "Nova")
- [ ] Verify selections persist across panel close/open

### 3.2 TTS Generation Flow
- [ ] Type "speak: hello world" or use /audio command
- [ ] Verify TTS generation initiates
- [ ] Wait for audio generation to complete
- [ ] Verify audio player appears with playback controls
- [ ] Test playback (play/pause controls)

### 3.3 TTS Download
- [ ] Generate audio
- [ ] Verify download option is available
- [ ] Download the audio file
- [ ] Verify downloaded file plays correctly

---

## 4. Local Model Upload and Selection

### 4.1 Upload Flow with Real Status States
- [ ] Navigate to Settings → Upload tab
- [ ] Click "Select Files" button
- [ ] Select a GGUF or Safetensors file
- [ ] Verify upload progress bar appears immediately
- [ ] Verify status transitions: "Uploading" → "Validating" → "Processing" → "Ready"
- [ ] Verify file appears in Models tab immediately (no page refresh needed)

### 4.2 Upload Status Visualization
- [ ] Upload a file and observe status states
- [ ] Verify "Uploading" state with percentage (0-50%)
- [ ] Verify "Validating" state with percentage (50-85%)
- [ ] Verify "Processing" state with percentage (85-99%)
- [ ] Verify "Ready" state with completion indicator
- [ ] Verify error state displays correctly if validation fails

### 4.3 OPFS Streaming (Android/Browser)
- [ ] Check if device supports OPFS (settings should show capability warnings)
- [ ] For supported browsers: verify large file uploads work without memory issues
- [ ] For unsupported browsers: verify fallback to regular upload still works

### 4.4 Model Card Selection
- [ ] Navigate to Settings → Models tab
- [ ] Click on an uploaded model card
- [ ] Verify card shows selected state (highlighted border, checkmark)
- [ ] Verify clicking different model card changes selection
- [ ] Verify model selection persists after closing Settings

### 4.5 Model Persistence and Routing
- [ ] Upload and validate a local model
- [ ] Go to Agents panel and assign model to Chat Agent
- [ ] Refresh the page (reload)
- [ ] Verify model selection is restored from localStorage
- [ ] Send a chat message with local model enabled
- [ ] Verify inference uses the selected model (not random auto-selection)

### 4.6 No Random Auto-Selection
- [ ] Set a specific provider model (e.g., "Claude Sonnet")
- [ ] Refresh page
- [ ] Verify the same model is still selected (not reset to first model)
- [ ] Verify inference uses the explicitly selected model

---

## 5. Local Inference Output Cleanup

### 5.1 Remove Tool/Debug Artifacts
- [ ] Enable local model mode
- [ ] Send a chat message
- [ ] Verify no "Tool: text_generation" messages appear in output
- [ ] Verify no "Tool: image_generation" for image tasks
- [ ] Verify no "Tool: audio_generation" for audio tasks

### 5.2 Real Content Not Placeholders
- [ ] When local inference server is NOT available:
  - Verify informative message about server requirement appears
  - Verify message does NOT contain placeholder scaffolding blocks
  - Verify model name and format are correctly shown
- [ ] When local inference server IS available:
  - Verify actual model-generated content streams
  - Verify no placeholder template text

### 5.3 Clean User Output
- [ ] Send multiple messages in conversation
- [ ] Verify each response is clean (no internal tool artifacts)
- [ ] Verify conversation history shows only user/assistant messages

---

## 6. Output Format System

### 6.1 Automatic Format Detection
- [ ] Type a message that triggers code response
- [ ] Verify code blocks render with proper syntax styling
- [ ] Type a message that triggers checklist
- [ ] Verify checklist renders with interactive checkboxes
- [ ] Type a message that triggers step-by-step guide
- [ ] Verify numbered steps render correctly

### 6.2 Real-Time Streaming Rendering
- [ ] Send a request that generates formatted output
- [ ] Verify format components render progressively during streaming
- [ ] Verify no format selector is shown or required
- [ ] Verify all formats are enabled by default simultaneously

### 6.3 Mixed Format Rendering
- [ ] Type a message that generates mixed content (e.g., steps + code)
- [ ] Verify multiple formats render in the same response
- [ ] Verify each section uses appropriate format component

### 6.4 Safe Fallback Renderer
- [ ] Send a message that generates plain text
- [ ] Verify plain text renders without errors
- [ ] Verify no "Unknown format" or error messages appear

---

## 7. Auto-Swarming Orchestration

### 7.1 Complexity Detection
- [ ] Send simple message ("Hello")
- [ ] Verify quick response (no multi-agent dispatch)
- [ ] Send complex message ("Research and analyze the complete architecture in depth")
- [ ] Verify orchestrator identifies complexity

### 7.2 Agent Invocation for Complex Tasks
- [ ] Send a very complex task
- [ ] Check Agents panel for additional agent activations
- [ ] Verify additional agents are invoked appropriately
- [ ] Verify traceability logs show invoked agents

### 7.3 Multi-Agent Fan-out/Fan-in
- [ ] Send a task requiring multiple specialized responses
- [ ] Verify responses are aggregated coherently
- [ ] Verify synthesized output includes contributions from multiple agents
- [ ] Verify primary response is clearly identified

### 7.4 Traceability Logs
- [ ] Send a complex task
- [ ] Open browser console (F12)
- [ ] Verify agent invocation logs appear
- [ ] Verify logs show agent names, reasons, and timing

---

## 8. Android Local T2I/TTS Runtime

### 8.1 OPFS Storage Support
- [ ] Access the app from Chrome/Edge on Android
- [ ] Verify OPFS capability is detected
- [ ] Upload a large model file (>100MB)
- [ ] Verify upload completes without browser crash
- [ ] Verify file is stored in OPFS (persists across sessions)

### 8.2 T2I Model Validation (Safetensors)
- [ ] Upload a Safetensors file
- [ ] Verify format validation runs
- [ ] Verify T2I models appear in selectable options

### 8.3 TTS Model Validation (GGUF/ONNX)
- [ ] Upload a GGUF file (for TTS)
- [ ] Verify format validation runs
- [ ] Verify TTS models appear in selectable options

### 8.4 Worker-Based Processing
- [ ] Upload a large file
- [ ] Verify UI remains responsive during upload
- [ ] Verify progress updates without freezing
- [ ] Verify no "Aw, snap" or crash on large file upload

### 8.5 Device/Runtime Warnings
- [ ] Access from unsupported browser
- [ ] Verify capability warnings appear
- [ ] Verify warnings provide actionable suggestions
- [ ] Verify warnings don't block usage, just inform user

---

## 9. Quality and Regression Testing

### 9.1 Existing OpenAI-Compatible Flows
- [ ] Test chat with Pollinations provider (default)
- [ ] Test chat with custom OpenAI-compatible endpoint
- [ ] Verify streaming works in all cases
- [ ] Verify error handling works correctly

### 9.2 No Console Errors
- [ ] Open browser developer console
- [ ] Perform various actions (send message, upload, settings changes)
- [ ] Verify no JavaScript errors in console
- [ ] Verify no unhandled promise rejections

### 9.3 No Runtime Errors
- [ ] Test all panel open/close transitions
- [ ] Test rapid message sending
- [ ] Test concurrent file uploads
- [ ] Verify no crashes or freezes

### 9.4 Persistence Tests
- [ ] Set various configurations (providers, models, connections)
- [ ] Refresh page
- [ ] Verify all configurations persist correctly
- [ ] Clear localStorage
- [ ] Verify app resets to default state gracefully

---

## 10. Performance Testing

### 10.1 Streaming Performance
- [ ] Send a message and measure time to first token
- [ ] Verify first token appears within reasonable time (<2s for typical API)
- [ ] Verify tokens continue streaming smoothly

### 10.2 Upload Performance
- [ ] Upload a 100MB file
- [ ] Verify progress updates smoothly
- [ ] Verify total upload time is reasonable

### 10.3 Memory Usage
- [ ] Monitor memory during large file upload
- [ ] Verify no memory leaks during extended use
- [ ] Verify OPFS prevents memory issues for large files

---

## 11. Accessibility Testing

### 11.1 Keyboard Navigation
- [ ] Navigate settings with keyboard (Tab, Enter, Arrow keys)
- [ ] Verify all interactive elements are focusable
- [ ] Verify focus indicators are visible

### 11.2 Screen Reader Compatibility
- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Verify interactive elements have proper labels
- [ ] Verify status messages are announced

---

## 12. Cross-Browser Testing

### 12.1 Chrome/Edge (Desktop)
- [ ] All features functional
- [ ] OPFS support: Yes

### 12.2 Chrome/Edge (Mobile/Android)
- [ ] All features functional
- [ ] OPFS support: Yes
- [ ] Upload handling: Good

### 12.3 Safari (Desktop/Mobile)
- [ ] All features functional
- [ ] OPFS support: Yes (Safari 15.2+)
- [ ] Verify WebGL/WebGPU work

### 12.4 Firefox
- [ ] All features functional
- [ ] OPFS support: Limited (may show warnings)
- [ ] Verify graceful fallback

---

## Issue Reporting

If you encounter any issues during testing, please report:

1. **Feature**: Which feature is affected
2. **Steps to Reproduce**: Clear reproduction steps
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Browser/OS**: Browser version and operating system
6. **Console Logs**: Any relevant console errors
7. **Screenshots**: If applicable

---

## Sign-Off Checklist

Before marking implementation as complete, verify:

- [ ] All checkbox items in this checklist are checked
- [ ] No critical issues remain open
- [ ] Performance is acceptable
- [ ] Code passes linting and type checking
- [ ] All existing tests pass
- [ ] New tests cover all new functionality
- [ ] Documentation is updated

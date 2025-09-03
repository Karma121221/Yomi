import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../styles/Compare.css';

// React port of Inspira UI Compare (Vue) with a similar API
// Props:
// - firstImage, secondImage, firstImageAlt, secondImageAlt
// - className: extra classes on root
// - firstContentClass, secondContentClass
// - initialSliderPercentage (0-100)
// - slideMode: 'hover' | 'drag'
// - showHandlebar: boolean
// - autoplay: boolean
// - autoplayDuration: ms
// Events (callbacks): onUpdatePercentage(number), onDragStart(), onDragEnd(), onHoverEnter(), onHoverLeave()
export default function Compare({
	firstImage = '',
	secondImage = '',
	firstImageAlt = 'First image',
	secondImageAlt = 'Second image',
	className = '',
	firstContentClass = '',
	secondContentClass = '',
	initialSliderPercentage = 50,
	slideMode = 'hover',
	showHandlebar = true,
	autoplay = false,
	autoplayDuration = 5000,
	onUpdatePercentage,
	onDragStart,
	onDragEnd,
	onHoverEnter,
	onHoverLeave,
	style,
}) {
	const containerRef = useRef(null);
	const [percent, setPercent] = useState(clamp(initialSliderPercentage));
	const isDraggingRef = useRef(false);
	const isMouseOverRef = useRef(false);
	const isInteractingRef = useRef(false);
	const rafRef = useRef(null);
	const startTimeRef = useRef(0);

	// Keep external listeners stable
	const emitUpdate = useCallback((p) => {
		onUpdatePercentage && onUpdatePercentage(p);
	}, [onUpdatePercentage]);

	const stopAutoplay = useCallback(() => {
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
	}, []);

	const animate = useCallback(() => {
		if (!autoplay || isMouseOverRef.current || isDraggingRef.current) return;
		const now = performance.now();
		const elapsed = now - startTimeRef.current;
		const period = Math.max(100, autoplayDuration); // safety
		const t = (elapsed % (period * 2)) / period; // 0..2
		const triangle = t <= 1 ? t : (2 - t); // 1..0 after 1
		const newP = clamp(triangle * 100);
		setPercent(newP);
		emitUpdate(newP);
		rafRef.current = requestAnimationFrame(animate);
	}, [autoplay, autoplayDuration, emitUpdate]);

	const startAutoplay = useCallback(() => {
		if (!autoplay) return;
		stopAutoplay();
		startTimeRef.current = performance.now();
		rafRef.current = requestAnimationFrame(animate);
	}, [autoplay, animate, stopAutoplay]);

	// Restart autoplay when relevant props change
	useEffect(() => {
		if (autoplay) startAutoplay();
		return () => stopAutoplay();
	}, [autoplay, autoplayDuration, startAutoplay, stopAutoplay]);

	// Sync external changes to initial percentage
	useEffect(() => {
		setPercent(clamp(initialSliderPercentage));
	}, [initialSliderPercentage]);

	const updateFromClientX = useCallback((clientX) => {
		const el = containerRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const x = clientX - rect.left;
		const p = clamp((x / rect.width) * 100);
		setPercent(p);
		emitUpdate(p);
	}, [emitUpdate]);

	const handleMouseEnter = () => {
		isMouseOverRef.current = true;
		onHoverEnter && onHoverEnter();
		if (autoplay) stopAutoplay();
	};

	const handleMouseLeave = () => {
		isMouseOverRef.current = false;
		isInteractingRef.current = false;
		onHoverLeave && onHoverLeave();
		if (slideMode === 'hover') {
			setPercent(clamp(initialSliderPercentage));
			emitUpdate(clamp(initialSliderPercentage));
		}
		if (slideMode === 'drag') {
			isDraggingRef.current = false;
		}
		if (autoplay) startAutoplay();
	};

	const handleMouseMove = (e) => {
		if (slideMode === 'hover' || (slideMode === 'drag' && isDraggingRef.current)) {
			isInteractingRef.current = true;
			if (autoplay) stopAutoplay();
			updateFromClientX(e.clientX);
		}
	};

	// Create refs to store the latest handler functions to avoid dependency issues
	const handlersRef = useRef({});

	const endDrag = useCallback(() => {
		if (slideMode !== 'drag') return;
		if (!isDraggingRef.current) return;
		isDraggingRef.current = false;
		isInteractingRef.current = false;
		onDragEnd && onDragEnd();
		if (autoplay && !isMouseOverRef.current) startAutoplay();
		// Remove listeners
		document.removeEventListener('mousemove', handlersRef.current.handleDocMouseMove);
		document.removeEventListener('mouseup', handlersRef.current.handleDocMouseUp);
		document.removeEventListener('touchmove', handlersRef.current.handleDocTouchMove);
		document.removeEventListener('touchend', handlersRef.current.handleDocTouchEnd);
	}, [autoplay, onDragEnd, slideMode, startAutoplay]);

	const handleDocMouseMove = useCallback((e) => {
		updateFromClientX(e.clientX);
	}, [updateFromClientX]);

	const handleDocTouchMove = useCallback((e) => {
		if (e.touches && e.touches[0]) updateFromClientX(e.touches[0].clientX);
	}, [updateFromClientX]);

	const handleDocMouseUp = useCallback(() => endDrag(), [endDrag]);
	const handleDocTouchEnd = useCallback(() => endDrag(), [endDrag]);

	// Update the refs with the latest handlers
	handlersRef.current = {
		handleDocMouseMove,
		handleDocMouseUp,
		handleDocTouchMove,
		handleDocTouchEnd
	};

	const startDrag = () => {
		if (slideMode !== 'drag') return;
		isDraggingRef.current = true;
		isInteractingRef.current = true;
		onDragStart && onDragStart();
		stopAutoplay();
		// Add listeners to capture outside container too
		document.addEventListener('mousemove', handlersRef.current.handleDocMouseMove);
		document.addEventListener('mouseup', handlersRef.current.handleDocMouseUp);
		document.addEventListener('touchmove', handlersRef.current.handleDocTouchMove, { passive: false });
		document.addEventListener('touchend', handlersRef.current.handleDocTouchEnd);
	};

	const handleMouseDown = () => startDrag();
	const handleTouchStart = (e) => {
		startDrag();
		if (slideMode === 'drag' && e.cancelable) e.preventDefault();
	};
	const handleTouchMove = (e) => {
		if (slideMode === 'drag' && e.touches && e.touches[0]) {
			updateFromClientX(e.touches[0].clientX);
		}
	};
	const handleTouchEnd = () => endDrag();

	useEffect(() => () => stopAutoplay(), [stopAutoplay]);

	return (
		<div
			ref={containerRef}
			className={`compare-root ${className || ''}`.trim()}
			style={{ ...style, position: 'relative' }}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onMouseMove={handleMouseMove}
			onMouseDown={handleMouseDown}
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
			role="region"
			aria-label="Before and after comparison slider"
		>
			{/* Second content (background) */}
			<div className={`compare-layer compare-second ${secondContentClass || ''}`.trim()}>
				{secondImage ? (
					<img
						src={secondImage}
						alt={secondImageAlt}
						className="compare-img"
						draggable={false}
					/>
				) : null}
			</div>

			{/* First content (clipped to slider) */}
			<div
				className={`compare-layer compare-first ${firstContentClass || ''}`.trim()}
				style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
			>
				{firstImage ? (
					<img
						src={firstImage}
						alt={firstImageAlt}
						className="compare-img"
						draggable={false}
					/>
				) : null}
			</div>

			{/* Slider line and handle */}
			<div
				className={`compare-divider ${slideMode === 'drag' ? 'is-drag' : 'is-hover'}`}
				style={{ left: `${percent}%` }}
				aria-hidden
			>
				{showHandlebar && (
					<div className="compare-handle" />
				)}
			</div>
		</div>
	);
}

function clamp(n) {
	if (Number.isNaN(n)) return 0;
	return Math.max(0, Math.min(100, n));
}


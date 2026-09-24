import React, { useEffect, useRef, useState } from 'react';

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

/* =========================================================
 * APP ALERT
 *
 * Themed replacement for React Native's Alert.alert.
 * Same signature: AppAlert.alert(title, message, buttons, options)
 *
 * options.type can force 'success' | 'error' | 'warning' | 'confirm';
 * otherwise the type is inferred from the title and buttons.
 * ========================================================= */

let alertHost = null;

const pendingQueue = [];

const SUCCESS_WORDS = /success|updated|sent|delivered|verified|complete|saved/i;

const ERROR_WORDS =
  /fail|error|invalid|expired|unavailable|missing|mismatch|not match|denied|too short|weak/i;

const inferType = (title, buttons) => {
  if (buttons.length > 1) {
    return 'confirm';
  }

  if (SUCCESS_WORDS.test(title)) {
    return 'success';
  }

  if (ERROR_WORDS.test(title)) {
    return 'error';
  }

  return 'warning';
};

const buildAlert = (title, message, buttons, options = {}) => {
  const safeButtons =
    Array.isArray(buttons) && buttons.length > 0 ? buttons : [{ text: 'OK' }];

  return {
    title: String(title ?? ''),
    message: message ? String(message) : '',
    buttons: safeButtons,
    cancelable: options?.cancelable !== false,
    type: options?.type || inferType(String(title ?? ''), safeButtons),
  };
};

const AppAlert = {
  alert(title, message, buttons, options) {
    const config = buildAlert(title, message, buttons, options);

    if (alertHost) {
      alertHost(config);
    } else {
      pendingQueue.push(config);
    }
  },
};

export default AppAlert;

/* =========================================================
 * THEME
 * ========================================================= */

const TYPE_THEME = {
  success: {
    icon: '✓',
    outer: '#ecfdf3',
    inner: '#16a34a',
  },

  error: {
    icon: '!',
    outer: '#fff1f2',
    inner: '#d00018',
  },

  warning: {
    icon: '!',
    outer: '#fff7ed',
    inner: '#f59e0b',
  },

  confirm: {
    icon: '?',
    outer: '#fff1f2',
    inner: '#d00018',
  },
};

/* =========================================================
 * HOST (mount once at the app root)
 * ========================================================= */

export const AppAlertHost = () => {
  const [queue, setQueue] = useState([]);

  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    alertHost = config => {
      if (mountedRef.current) {
        setQueue(current => [...current, config]);
      }
    };

    if (pendingQueue.length > 0) {
      setQueue(current => [...current, ...pendingQueue.splice(0)]);
    }

    return () => {
      mountedRef.current = false;
      alertHost = null;
    };
  }, []);

  const current = queue[0];

  const dismiss = button => {
    setQueue(items => items.slice(1));

    if (typeof button?.onPress === 'function') {
      setTimeout(() => {
        button.onPress();
      }, 250);
    }
  };

  const handleBackdrop = () => {
    if (!current?.cancelable) {
      return;
    }

    dismiss(current.buttons.find(button => button?.style === 'cancel'));
  };

  const theme = TYPE_THEME[current?.type] || TYPE_THEME.warning;

  const isRow = current?.buttons?.length === 2;

  return (
    <Modal
      visible={Boolean(current)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleBackdrop}
    >
      {current ? (
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={handleBackdrop}
          />

          <View style={styles.card}>
            {current.cancelable ? (
              <Pressable onPress={handleBackdrop} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            ) : null}

            <View style={[styles.iconOuter, { backgroundColor: theme.outer }]}>
              <View
                style={[styles.iconInner, { backgroundColor: theme.inner }]}
              >
                <Text style={styles.iconText}>{theme.icon}</Text>
              </View>
            </View>

            <Text style={styles.title}>{current.title}</Text>

            {current.message ? (
              <Text style={styles.message}>{current.message}</Text>
            ) : null}

            <View style={[styles.buttons, isRow && styles.buttonsRow]}>
              {current.buttons.map((button, index) => {
                const isCancel = button?.style === 'cancel';

                const isDestructive = button?.style === 'destructive';

                return (
                  <Pressable
                    key={`${button?.text ?? 'button'}-${index}`}
                    onPress={() => dismiss(button)}
                    style={({ pressed }) => [
                      styles.button,
                      isRow && styles.buttonInRow,
                      isCancel ? styles.cancelButton : styles.primaryButton,
                      isDestructive && styles.destructiveButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isCancel && styles.cancelButtonText,
                      ]}
                    >
                      {button?.text || 'OK'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}
    </Modal>
  );
};

/* =========================================================
 * STYLES
 * ========================================================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.65)',
    paddingHorizontal: 24,
  },

  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingTop: 38,
    paddingHorizontal: 24,
    paddingBottom: 24,
    elevation: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },

  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    color: '#6b7280',
    fontSize: 26,
    lineHeight: 28,
  },

  iconOuter: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  iconInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconText: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
  },

  title: {
    color: '#17191c',
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
  },

  message: {
    maxWidth: 300,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
  },

  buttons: {
    width: '100%',
    marginTop: 26,
    gap: 12,
  },

  buttonsRow: {
    flexDirection: 'row',
  },

  button: {
    width: '100%',
    minHeight: 55,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  buttonInRow: {
    width: undefined,
    flex: 1,
  },

  primaryButton: {
    backgroundColor: '#d00018',
  },

  destructiveButton: {
    backgroundColor: '#b00014',
  },

  cancelButton: {
    backgroundColor: '#f3f4f6',
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },

  cancelButtonText: {
    color: '#374151',
  },
});

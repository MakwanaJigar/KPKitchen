import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  CommonActions,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';

import axios from 'axios';

import {
  launchImageLibrary,
} from 'react-native-image-picker';

/* =========================================================
 * API
 * ========================================================= */

const PROFILE_API_URL =
  'https://replete-software.com/projects/kp_admin/api/driver/profile';

const PROFILE_EDIT_API_URL =
  'https://replete-software.com/projects/kp_admin/api/driver/profile/edit';

const LOGOUT_API_URL =
  'https://replete-software.com/projects/kp_admin/api/driver/logout';

const PROJECT_BASE_URL =
  'https://replete-software.com/projects/kp_admin';

const PUBLIC_BASE_URL =
  'https://replete-software.com/projects/kp_admin/public';

/* =========================================================
 * STORAGE
 * ========================================================= */

const AUTH_TOKEN_KEY =
  '@kp_kitchen_driver_token';

const AUTH_USER_KEY =
  '@kp_kitchen_driver_user';

const AUTH_EMAIL_KEY =
  '@kp_kitchen_driver_email';

const AUTH_LOGOUT_FLAG_KEY =
  '@kp_kitchen_driver_logged_out';

/* =========================================================
 * DEFAULT PROFILE
 * ========================================================= */

const EMPTY_PROFILE = {
  id: null,

  name: '',

  firstName: '',

  lastName: '',

  email: '',

  phone: '',

  address: '',

  licenseNumber: '',

  licenseExpiry: '',

  licenseFront: '',

  licenseBack: '',

  profileImage: '',

  vehicleNumber: '',

  assignedZip: '',

  assignedArea: '',

  status: '',

  userType: 'driver',

  totalAssignedOrders: 0,

  activeShipments: 0,

  recentDeliveries: [],
};

/* =========================================================
 * EDIT FORM
 * ========================================================= */

const EMPTY_EDIT_FORM = {
  first_name: '',

  last_name: '',

  phone: '',

  email: '',

  address: '',

  vehicle_reg_no: '',

  license_no: '',

  license_expiry: '',

  assigned_zip: '',

  old_password: '',

  new_password: '',

  new_password_confirmation: '',
};

/* =========================================================
 * FALLBACK IMAGE
 * ========================================================= */

const DEFAULT_PROFILE_IMAGE =
  'https://images.unsplash.com/photo-1560250097-0b93528c311a';

/* =========================================================
 * IMAGE URL CANDIDATES
 * ========================================================= */

const getImageUrlCandidates =
  value => {
    if (!value) {
      return [];
    }

    let original =
      String(value)
        .trim()
        .replace(
          /\\/g,
          '/',
        );

    if (!original) {
      return [];
    }

    /*
     * Local device images.
     */

    if (
      original.startsWith(
        'file://',
      ) ||
      original.startsWith(
        'content://',
      ) ||
      original.startsWith(
        'ph://',
      )
    ) {
      return [
        original,
      ];
    }

    const candidates =
      [];

    /*
     * If backend already gives complete URL,
     * try it first.
     */

    if (
      original.startsWith(
        'https://',
      ) ||
      original.startsWith(
        'http://',
      )
    ) {
      candidates.push(
        original,
      );
    }

    /*
     * Convert absolute domain URL to relative path
     * so we can build fallback URLs.
     */

    let path =
      original;

    path =
      path.replace(
        /^https?:\/\/replete-software\.com\//i,
        '',
      );

    path =
      path.replace(
        /^\/+/,
        '',
      );

    /*
     * Remove project directory if already present.
     */

    if (
      path.startsWith(
        'projects/kp_admin/',
      )
    ) {
      path =
        path.substring(
          'projects/kp_admin/'
            .length,
        );
    }

    /*
     * Laravel physical storage path:
     *
     * storage/app/public/license/test.jpg
     *
     * Public equivalent should normally be:
     *
     * public/storage/license/test.jpg
     */

    if (
      path.startsWith(
        'storage/app/public/',
      )
    ) {
      path =
        path.replace(
          'storage/app/public/',
          'storage/',
        );
    }

    /*
     * If API gives public/storage/...
     */

    if (
      path.startsWith(
        'public/',
      )
    ) {
      candidates.push(
        `${PROJECT_BASE_URL}/${path}`,
      );

      path =
        path.substring(
          'public/'.length,
        );
    }

    /*
     * storage/....
     */

    if (
      path.startsWith(
        'storage/',
      )
    ) {
      candidates.push(
        `${PUBLIC_BASE_URL}/${path}`,
      );

      candidates.push(
        `${PROJECT_BASE_URL}/${path}`,
      );
    }

    /*
     * uploads/....
     */

    if (
      path.startsWith(
        'uploads/',
      )
    ) {
      candidates.push(
        `${PUBLIC_BASE_URL}/${path}`,
      );

      candidates.push(
        `${PROJECT_BASE_URL}/${path}`,
      );
    }

    /*
     * Generic possibilities.
     */

    candidates.push(
      `${PUBLIC_BASE_URL}/${path}`,
    );

    candidates.push(
      `${PROJECT_BASE_URL}/${path}`,
    );

    /*
     * Laravel storage fallback.
     *
     * Example backend:
     *
     * drivers/licenses/front.jpg
     *
     * Real public URL:
     *
     * public/storage/drivers/licenses/front.jpg
     */

    if (
      !path.startsWith(
        'storage/',
      )
    ) {
      candidates.push(
        `${PUBLIC_BASE_URL}/storage/${path}`,
      );
    }

    /*
     * Sometimes uploads are stored under
     * public/uploads.
     */

    if (
      !path.startsWith(
        'uploads/',
      )
    ) {
      candidates.push(
        `${PUBLIC_BASE_URL}/uploads/${path}`,
      );
    }

    /*
     * Remove duplicate URLs.
     */

    return [
      ...new Set(
        candidates,
      ),
    ];
  };

/* =========================================================
 * IMAGE SOURCE
 * ========================================================= */

const createImageSource = (
  uri,
  token,
) => {
  if (!uri) {
    return null;
  }

  const isLocal =
    uri.startsWith(
      'file://',
    ) ||
    uri.startsWith(
      'content://',
    ) ||
    uri.startsWith(
      'ph://',
    );

  if (
    isLocal ||
    !token
  ) {
    return {
      uri,
    };
  }

  /*
   * Important:
   * If Laravel protects the licence image,
   * React Native will send the driver's
   * bearer token while loading it.
   */

  return {
    uri,

    headers: {
      Accept:
        'image/*',

      Authorization:
        `Bearer ${token}`,
    },
  };
};

/* =========================================================
 * GET DISPLAY VALUE
 * ========================================================= */

const getDisplayValue = (
  ...values
) => {
  for (
    const value
    of values
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      continue;
    }

    if (
      typeof value ===
        'string' ||
      typeof value ===
        'number'
    ) {
      return String(
        value,
      ).trim();
    }

    if (
      typeof value ===
        'object'
    ) {
      const objectValue =
        value?.name ??
        value?.title ??
        value?.label ??
        value?.value ??
        value?.url ??
        value?.path;

      if (
        objectValue !==
          null &&
        objectValue !==
          undefined &&
        objectValue !==
          ''
      ) {
        return String(
          objectValue,
        ).trim();
      }
    }
  }

  return '';
};

/* =========================================================
 * API ERROR
 * ========================================================= */

const getApiErrorMessage = (
  error,
  fallback =
    'Something went wrong.',
) => {
  const data =
    error?.response?.data;

  if (
    data?.message
  ) {
    return String(
      data.message,
    );
  }

  if (
    data?.error
  ) {
    return String(
      data.error,
    );
  }

  if (
    data?.errors &&
    typeof data.errors ===
      'object'
  ) {
    const keys =
      Object.keys(
        data.errors,
      );

    if (
      keys.length > 0
    ) {
      const firstError =
        data.errors[
          keys[0]
        ];

      if (
        Array.isArray(
          firstError,
        )
      ) {
        return String(
          firstError[0] ??
            fallback,
        );
      }

      if (
        firstError
      ) {
        return String(
          firstError,
        );
      }
    }
  }

  return (
    error?.message ||
    fallback
  );
};

/* =========================================================
 * EXTRACT PROFILE
 * ========================================================= */

const extractProfileData =
  responseData => {
    return (
      responseData?.driver ||
      responseData
        ?.data
        ?.driver ||
      responseData?.profile ||
      responseData
        ?.data
        ?.profile ||
      responseData?.user ||
      responseData
        ?.data
        ?.user ||
      responseData?.data ||
      responseData ||
      {}
    );
  };

/* =========================================================
 * NORMALIZE PROFILE
 * ========================================================= */

const normalizeProfileData =
  rawProfile => {
    const firstName =
      getDisplayValue(
        rawProfile
          ?.first_name,

        rawProfile
          ?.firstName,
      );

    const lastName =
      getDisplayValue(
        rawProfile
          ?.last_name,

        rawProfile
          ?.lastName,
      );

    const combinedName =
      `${firstName} ${lastName}`
        .trim();

    /*
     * IMPORTANT:
     * Keep licence image path EXACTLY
     * as returned from API.
     *
     * We resolve possible URLs later.
     */

    const licenseFront =
      getDisplayValue(
        rawProfile
          ?.license_copy_front,

        rawProfile
          ?.licence_copy_front,

        rawProfile
          ?.license_front,

        rawProfile
          ?.license_front_url,
      );

    const licenseBack =
      getDisplayValue(
        rawProfile
          ?.license_copy_back,

        rawProfile
          ?.licence_copy_back,

        rawProfile
          ?.license_back,

        rawProfile
          ?.license_back_url,
      );

    console.log(
      'RAW LICENCE FRONT FROM API:',
      licenseFront,
    );

    console.log(
      'RAW LICENCE BACK FROM API:',
      licenseBack,
    );

    console.log(
      'FRONT URL CANDIDATES:',
      getImageUrlCandidates(
        licenseFront,
      ),
    );

    console.log(
      'BACK URL CANDIDATES:',
      getImageUrlCandidates(
        licenseBack,
      ),
    );

    return {
      id:
        rawProfile?.id ??
        rawProfile
          ?.driver_id ??
        null,

      name:
        getDisplayValue(
          rawProfile?.name,

          rawProfile
            ?.full_name,

          rawProfile
            ?.driver_name,

          combinedName,
        ),

      firstName,

      lastName,

      email:
        getDisplayValue(
          rawProfile?.email,

          rawProfile?.mail,
        ),

      phone:
        getDisplayValue(
          rawProfile?.phone,

          rawProfile?.mobile,

          rawProfile
            ?.mobile_number,

          rawProfile
            ?.phone_number,
        ),

      address:
        getDisplayValue(
          rawProfile
            ?.address,

          rawProfile
            ?.residential_address,

          rawProfile
            ?.driver_address,
        ),

      licenseNumber:
        getDisplayValue(
          rawProfile
            ?.license_no,

          rawProfile
            ?.license_number,

          rawProfile
            ?.licence_number,

          rawProfile
            ?.licenseNumber,
        ),

      licenseExpiry:
        getDisplayValue(
          rawProfile
            ?.license_expiry,

          rawProfile
            ?.licence_expiry,

          rawProfile
            ?.licenseExpiry,
        ),

      licenseFront,

      licenseBack,

      profileImage:
        getDisplayValue(
          rawProfile
            ?.profile_image,

          rawProfile
            ?.profile_photo,

          rawProfile?.avatar,

          rawProfile?.image,

          rawProfile?.photo,
        ),

      vehicleNumber:
        getDisplayValue(
          rawProfile
            ?.vehicle_reg_no,

          rawProfile
            ?.vehicle_number,

          rawProfile
            ?.vehicleNumber,

          rawProfile
            ?.vehicle_no,
        ),

      assignedZip:
        getDisplayValue(
          rawProfile
            ?.assigned_zip,

          rawProfile?.zipcode,

          rawProfile
            ?.zip_code,

          rawProfile
            ?.postal_code,

          rawProfile?.pincode,
        ),

      assignedArea:
        getDisplayValue(
          rawProfile?.area,

          rawProfile
            ?.assigned_area,

          rawProfile
            ?.delivery_area,

          rawProfile?.cluster,

          rawProfile
            ?.assigned_zip,
        ),

      status:
        getDisplayValue(
          rawProfile?.status,

          rawProfile
            ?.approval_status,

          rawProfile
            ?.account_status,
        ),

      userType:
        getDisplayValue(
          rawProfile
            ?.user_type,

          rawProfile?.type,

          'driver',
        ),

      totalAssignedOrders:
        Number(
          rawProfile
            ?.total_assigned_orders ??
          rawProfile
            ?.total_orders ??
          0,
        ) || 0,

      activeShipments:
        Number(
          rawProfile
            ?.active_shipments ??
          rawProfile
            ?.active_orders ??
          0,
        ) || 0,

      recentDeliveries:
        Array.isArray(
          rawProfile
            ?.recent_deliveries,
        )
          ? rawProfile
              .recent_deliveries
          : [],
    };
  };

/* =========================================================
 * FORMAT DATE
 * ========================================================= */

const formatDate =
  value => {
    if (
      !value
    ) {
      return 'Not available';
    }

    const date =
      new Date(
        value,
      );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return String(
        value,
      );
    }

    return date
      .toLocaleDateString(
        'en-AU',
        {
          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric',
        },
      );
  };

/* =========================================================
 * STATUS
 * ========================================================= */

const getStatusInfo =
  value => {
    const status =
      String(
        value ??
        '',
      )
        .trim()
        .toLowerCase();

    if (
      [
        'active',
        'approved',
        'verified',
      ].includes(
        status,
      )
    ) {
      return {
        label:
          value ||
          'Active',

        color:
          '#168044',

        background:
          '#e9f8ef',

        dot:
          '#32b768',
      };
    }

    if (
      [
        'pending',
        'pending_approval',
        'awaiting_approval',
      ].includes(
        status,
      )
    ) {
      return {
        label:
          value ||
          'Pending',

        color:
          '#9a6700',

        background:
          '#fff6df',

        dot:
          '#d99b16',
      };
    }

    if (
      [
        'inactive',
        'rejected',
        'suspended',
        'blocked',
      ].includes(
        status,
      )
    ) {
      return {
        label:
          value ||
          'Inactive',

        color:
          '#a9090d',

        background:
          '#fff0f1',

        dot:
          '#d00018',
      };
    }

    return {
      label:
        value ||
        'Unknown',

      color:
        '#596273',

      background:
        '#eef1f5',

      dot:
        '#7c8493',
    };
  };

/* =========================================================
 * PROFILE INFO ROW
 * ========================================================= */

const ProfileInfoRow = ({
  icon,
  label,
  value,
  multiline = false,
}) => {
  return (
    <View
      style={
        styles.profileInfoRow
      }
    >
      <View
        style={
          styles.profileInfoIcon
        }
      >
        <Text
          style={
            styles.profileInfoIconText
          }
        >
          {icon}
        </Text>
      </View>

      <View
        style={
          styles.profileInfoContent
        }
      >
        <Text
          style={
            styles.infoLabel
          }
        >
          {label}
        </Text>

        <Text
          numberOfLines={
            multiline
              ? 4
              : 1
          }
          style={
            styles.profileInfoValue
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
};

/* =========================================================
 * DOCUMENT CARD
 * ========================================================= */

const DocumentCard = ({
  title,
  subtitle,
  imageValue,
  authToken,
  onPress,
}) => {
  const candidates =
    getImageUrlCandidates(
      imageValue,
    );

  const [
    candidateIndex,
    setCandidateIndex,
  ] =
    useState(0);

  const [
    imageFailed,
    setImageFailed,
  ] =
    useState(false);

  useEffect(
    () => {
      setCandidateIndex(
        0,
      );

      setImageFailed(
        false,
      );
    },
    [
      imageValue,
    ],
  );

  const currentImage =
    candidates[
      candidateIndex
    ] ||
    '';

  const handleImageError =
    event => {
      console.log(
        `${title} THUMBNAIL FAILED:`,
        currentImage,

        event
          ?.nativeEvent
          ?.error,
      );

      if (
        candidateIndex <
        candidates.length -
          1
      ) {
        const nextIndex =
          candidateIndex +
          1;

        console.log(
          `${title} TRYING NEXT URL:`,
          candidates[
            nextIndex
          ],
        );

        setCandidateIndex(
          nextIndex,
        );
      } else {
        setImageFailed(
          true,
        );
      }
    };

  return (
    <Pressable
      disabled={
        !imageValue
      }
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.documentCard,

        pressed &&
          styles.cardPressed,

        !imageValue &&
          styles
            .documentCardUnavailable,
      ]}
    >
      <View
        style={
          styles.documentPreview
        }
      >
        {!!currentImage &&
        !imageFailed ? (
          <Image
            key={
              currentImage
            }
            source={
              createImageSource(
                currentImage,
                authToken,
              )
            }
            style={
              styles.documentImage
            }
            resizeMode="cover"
            onLoad={() => {
              console.log(
                `${title} THUMBNAIL LOADED:`,
                currentImage,
              );
            }}
            onError={
              handleImageError
            }
          />
        ) : (
          <View
            style={
              styles.documentPlaceholderBox
            }
          >
            <View
              style={
                styles.documentIconCircle
              }
            >
              <Text
                style={
                  styles.documentIconText
                }
              >
                ID
              </Text>
            </View>
          </View>
        )}
      </View>

      <View
        style={
          styles.documentContent
        }
      >
        <Text
          style={
            styles.documentTitle
          }
        >
          {title}
        </Text>

        <Text
          numberOfLines={
            2
          }
          style={
            styles.documentSubtitle
          }
        >
          {imageValue
            ? subtitle
            : 'Document not uploaded'}
        </Text>
      </View>

      {!!imageValue && (
        <View
          style={
            styles.documentArrowBox
          }
        >
          <Text
            style={
              styles.documentArrow
            }
          >
            ›
          </Text>
        </View>
      )}
    </Pressable>
  );
};

/* =========================================================
 * EDIT FIELD
 * ========================================================= */

const EditField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType =
    'default',
  multiline = false,
  secureTextEntry =
    false,
  autoCapitalize =
    'sentences',
  required = false,
}) => {
  return (
    <View
      style={
        styles.editField
      }
    >
      <Text
        style={
          styles.editFieldLabel
        }
      >
        {label}

        {required ? (
          <Text
            style={
              styles.requiredText
            }
          >
            {' '}*
          </Text>
        ) : null}
      </Text>

      <TextInput
        value={
          value
        }
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#a0a5ad"
        keyboardType={
          keyboardType
        }
        autoCapitalize={
          autoCapitalize
        }
        autoCorrect={
          false
        }
        multiline={
          multiline
        }
        secureTextEntry={
          secureTextEntry
        }
        style={[
          styles.editInput,

          multiline &&
            styles
              .editInputMultiline,
        ]}
      />
    </View>
  );
};

/* =========================================================
 * EDIT LICENCE IMAGE
 * ========================================================= */

const EditLicenseImage = ({
  title,
  imageUri,
  authToken,
  isNewImage,
  onPress,
  onReset,
}) => {
  const candidates =
    getImageUrlCandidates(
      imageUri,
    );

  const [
    candidateIndex,
    setCandidateIndex,
  ] =
    useState(0);

  const [
    failed,
    setFailed,
  ] =
    useState(false);

  useEffect(
    () => {
      setCandidateIndex(
        0,
      );

      setFailed(
        false,
      );
    },
    [
      imageUri,
    ],
  );

  const currentUri =
    candidates[
      candidateIndex
    ] ||
    '';

  const handleError =
    () => {
      if (
        candidateIndex <
        candidates.length -
          1
      ) {
        setCandidateIndex(
          previous =>
            previous + 1,
        );
      } else {
        setFailed(
          true,
        );
      }
    };

  return (
    <View
      style={
        styles.editImageSection
      }
    >
      <Text
        style={
          styles.editFieldLabel
        }
      >
        {title}
      </Text>

      <Pressable
        onPress={
          onPress
        }
        style={({
          pressed,
        }) => [
          styles.editImagePicker,

          pressed &&
            styles.cardPressed,
        ]}
      >
        {!!currentUri &&
        !failed ? (
          <Image
            key={
              currentUri
            }
            source={
              createImageSource(
                currentUri,
                authToken,
              )
            }
            style={
              styles.editImagePreview
            }
            resizeMode="contain"
            onError={
              handleError
            }
          />
        ) : (
          <View
            style={
              styles.editImagePlaceholder
            }
          >
            <Text
              style={
                styles.editImagePlaceholderIcon
              }
            >
              +
            </Text>

            <Text
              style={
                styles.editImagePlaceholderTitle
              }
            >
              Select Licence Photo
            </Text>
          </View>
        )}

        <View
          style={
            styles.editImageBottom
          }
        >
          <Text
            style={
              styles.editImageButtonText
            }
          >
            {imageUri
              ? 'Change Photo'
              : 'Choose Photo'}
          </Text>
        </View>
      </Pressable>

      {isNewImage && (
        <Pressable
          onPress={
            onReset
          }
          style={
            styles.resetImageButton
          }
        >
          <Text
            style={
              styles.resetImageButtonText
            }
          >
            Use existing photo
          </Text>
        </Pressable>
      )}
    </View>
  );
};

/* =========================================================
 * PROFILE SCREEN
 * ========================================================= */

const ProfileScreen =
  () => {
    const navigation =
      useNavigation();

    const {
      width,
    } =
      useWindowDimensions();

    /* =====================================================
     * STATE
     * ===================================================== */

    const [
      authToken,
      setAuthToken,
    ] =
      useState('');

    const [
      profile,
      setProfile,
    ] =
      useState(
        EMPTY_PROFILE,
      );

    const [
      profileLoading,
      setProfileLoading,
    ] =
      useState(true);

    const [
      refreshing,
      setRefreshing,
    ] =
      useState(false);

    const [
      profileError,
      setProfileError,
    ] =
      useState('');

    const [
      editProfileVisible,
      setEditProfileVisible,
    ] =
      useState(false);

    const [
      editProfileLoading,
      setEditProfileLoading,
    ] =
      useState(false);

    const [
      editProfileError,
      setEditProfileError,
    ] =
      useState('');

    const [
      editForm,
      setEditForm,
    ] =
      useState(
        EMPTY_EDIT_FORM,
      );

    const [
      licenseFrontFile,
      setLicenseFrontFile,
    ] =
      useState(null);

    const [
      licenseBackFile,
      setLicenseBackFile,
    ] =
      useState(null);

    const [
      editLicenseFrontPreview,
      setEditLicenseFrontPreview,
    ] =
      useState('');

    const [
      editLicenseBackPreview,
      setEditLicenseBackPreview,
    ] =
      useState('');

    const [
      documentPreview,
      setDocumentPreview,
    ] =
      useState({
        visible:
          false,

        title:
          '',

        original:
          '',

        candidates:
          [],

        index:
          0,
      });

    const [
      documentLoading,
      setDocumentLoading,
    ] =
      useState(false);

    const [
      documentError,
      setDocumentError,
    ] =
      useState(false);

    const [
      logoutPopupVisible,
      setLogoutPopupVisible,
    ] =
      useState(false);

    const [
      logoutLoading,
      setLogoutLoading,
    ] =
      useState(false);

    /* =====================================================
     * REFS
     * ===================================================== */

    const mountedRef =
      useRef(true);

    const loggingOutRef =
      useRef(false);

    const navigatingToLoginRef =
      useRef(false);

    const profileAbortRef =
      useRef(null);

    /* =====================================================
     * RESPONSIVE
     * ===================================================== */

    const isSmallScreen =
      width <= 360;

    const horizontalPadding =
      isSmallScreen
        ? 12
        : 16;

    const cardGap =
      isSmallScreen
        ? 8
        : 10;

    /* =====================================================
     * CANCEL
     * ===================================================== */

    const cancelRequests =
      () => {
        try {
          profileAbortRef
            .current
            ?.abort();
        } catch (
          error
        ) {}

        profileAbortRef.current =
          null;
      };

    /* =====================================================
     * CLEAR SESSION
     * ===================================================== */

    const clearLocalSession =
      async () => {
        try {
          await AsyncStorage
            .setItem(
              AUTH_LOGOUT_FLAG_KEY,
              '1',
            );

          await AsyncStorage
            .removeItem(
              AUTH_TOKEN_KEY,
            );

          await AsyncStorage
            .removeItem(
              AUTH_USER_KEY,
            );

          await AsyncStorage
            .removeItem(
              AUTH_EMAIL_KEY,
            );

          setAuthToken(
            '',
          );
        } catch (
          error
        ) {
          console.log(
            'CLEAR STORAGE ERROR:',
            error,
          );
        }

        try {
          if (
            axios.defaults &&
            axios.defaults
              .headers &&
            axios.defaults
              .headers
              .common
          ) {
            delete axios
              .defaults
              .headers
              .common
              .Authorization;
          }
        } catch (
          error
        ) {}
      };

    /* =====================================================
     * LOGIN REDIRECT
     * ===================================================== */

    const redirectToLogin =
      () => {
        if (
          navigatingToLoginRef
            .current
        ) {
          return;
        }

        navigatingToLoginRef
          .current =
          true;

        cancelRequests();

        let rootNavigation =
          navigation;

        let parent =
          rootNavigation
            .getParent?.();

        while (
          parent
        ) {
          rootNavigation =
            parent;

          parent =
            rootNavigation
              .getParent?.();
        }

        rootNavigation
          .dispatch(
            CommonActions
              .reset({
                index:
                  0,

                routes: [
                  {
                    name:
                      'Login',
                  },
                ],
              }),
          );
      };

    /* =====================================================
     * EXPIRED SESSION
     * ===================================================== */

    const handleExpiredSession =
      async () => {
        if (
          loggingOutRef
            .current
        ) {
          return;
        }

        loggingOutRef
          .current =
          true;

        cancelRequests();

        await clearLocalSession();

        redirectToLogin();
      };

    /* =====================================================
     * LOAD PROFILE
     * ===================================================== */

    const loadProfile =
      useCallback(
        async (
          isRefresh =
            false,
        ) => {
          if (
            loggingOutRef
              .current
          ) {
            return;
          }

          try {
            profileAbortRef
              .current
              ?.abort();
          } catch (
            error
          ) {}

          const controller =
            new AbortController();

          profileAbortRef.current =
            controller;

          try {
            if (
              mountedRef.current
            ) {
              if (
                isRefresh
              ) {
                setRefreshing(
                  true,
                );
              } else {
                setProfileLoading(
                  true,
                );
              }

              setProfileError(
                '',
              );
            }

            const logoutFlag =
              await AsyncStorage
                .getItem(
                  AUTH_LOGOUT_FLAG_KEY,
                );

            const token =
              await AsyncStorage
                .getItem(
                  AUTH_TOKEN_KEY,
                );

            if (
              logoutFlag ===
              '1'
            ) {
              await handleExpiredSession();

              return;
            }

            if (!token) {
              await handleExpiredSession();

              return;
            }

            setAuthToken(
              token,
            );

            const response =
              await axios.get(
                PROFILE_API_URL,

                {
                  headers: {
                    Accept:
                      'application/json',

                    Authorization:
                      `Bearer ${token}`,
                  },

                  signal:
                    controller
                      .signal,

                  timeout:
                    20000,
                },
              );

            if (
              controller
                .signal
                .aborted ||
              !mountedRef.current ||
              loggingOutRef
                .current
            ) {
              return;
            }

            console.log(
              'DRIVER PROFILE RESPONSE:',

              JSON.stringify(
                response?.data,
                null,
                2,
              ),
            );

            if (
              response?.data
                ?.success ===
                false ||
              response?.data
                ?.status ===
                false
            ) {
              throw new Error(
                response?.data
                  ?.message ||
                'Unable to load profile.',
              );
            }

            const rawProfile =
              extractProfileData(
                response.data,
              );

            const formattedProfile =
              normalizeProfileData(
                rawProfile,
              );

            setProfile(
              formattedProfile,
            );

            await AsyncStorage
              .setItem(
                AUTH_USER_KEY,

                JSON.stringify(
                  rawProfile,
                ),
              );
          } catch (
            error
          ) {
            if (
              controller
                .signal
                .aborted ||
              loggingOutRef
                .current
            ) {
              return;
            }

            const status =
              error
                ?.response
                ?.status;

            if (
              status === 401 ||
              status === 403
            ) {
              await handleExpiredSession();

              return;
            }

            console.log(
              'PROFILE API ERROR:',

              error
                ?.response
                ?.data ??
              error
                ?.message,
            );

            if (
              mountedRef.current
            ) {
              setProfileError(
                getApiErrorMessage(
                  error,

                  'Unable to load your profile.',
                ),
              );
            }
          } finally {
            if (
              mountedRef.current &&
              !controller
                .signal
                .aborted &&
              !loggingOutRef
                .current
            ) {
              setProfileLoading(
                false,
              );

              setRefreshing(
                false,
              );
            }
          }
        },
        [],
      );

    /* =====================================================
     * MOUNT
     * ===================================================== */

    useEffect(
      () => {
        mountedRef.current =
          true;

        loadProfile(
          false,
        );

        return () => {
          mountedRef.current =
            false;

          cancelRequests();
        };
      },
      [
        loadProfile,
      ],
    );

    useFocusEffect(
      useCallback(
        () => {
          if (
            !loggingOutRef
              .current
          ) {
            loadProfile(
              false,
            );
          }

          return () => {};
        },
        [
          loadProfile,
        ],
      ),
    );

    /* =====================================================
     * EDIT FORM
     * ===================================================== */

    const updateEditField =
      (
        key,
        value,
      ) => {
        setEditForm(
          previous => ({
            ...previous,

            [key]:
              value,
          }),
        );

        if (
          editProfileError
        ) {
          setEditProfileError(
            '',
          );
        }
      };

    /* =====================================================
     * OPEN EDIT
     * ===================================================== */

    const handleEditProfile =
      () => {
        if (
          editProfileLoading
        ) {
          return;
        }

        setEditForm({
          first_name:
            profile.firstName ||
            '',

          last_name:
            profile.lastName ||
            '',

          phone:
            profile.phone ||
            '',

          email:
            profile.email ||
            '',

          address:
            profile.address ||
            '',

          vehicle_reg_no:
            profile.vehicleNumber ||
            '',

          license_no:
            profile.licenseNumber ||
            '',

          license_expiry:
            profile.licenseExpiry ||
            '',

          assigned_zip:
            profile.assignedZip ||
            '',

          old_password:
            '',

          new_password:
            '',

          new_password_confirmation:
            '',
        });

        setLicenseFrontFile(
          null,
        );

        setLicenseBackFile(
          null,
        );

        setEditLicenseFrontPreview(
          profile.licenseFront ||
          '',
        );

        setEditLicenseBackPreview(
          profile.licenseBack ||
          '',
        );

        setEditProfileError(
          '',
        );

        setEditProfileVisible(
          true,
        );
      };

    /* =====================================================
     * CLOSE EDIT
     * ===================================================== */

    const closeEditProfile =
      () => {
        if (
          editProfileLoading
        ) {
          return;
        }

        setEditProfileVisible(
          false,
        );

        setEditProfileError(
          '',
        );

        setLicenseFrontFile(
          null,
        );

        setLicenseBackFile(
          null,
        );
      };

    /* =====================================================
     * PICK LICENCE IMAGE
     * ===================================================== */

    const pickLicenseImage =
      async side => {
        try {
          const result =
            await launchImageLibrary({
              mediaType:
                'photo',

              selectionLimit:
                1,

              quality:
                0.85,

              includeBase64:
                false,
            });

          if (
            result.didCancel
          ) {
            return;
          }

          if (
            result.errorCode
          ) {
            Alert.alert(
              'Image Error',

              result
                .errorMessage ||
              'Unable to select image.',
            );

            return;
          }

          const asset =
            result
              ?.assets?.[0];

          if (
            !asset?.uri
          ) {
            Alert.alert(
              'Image Error',

              'Unable to read the selected image.',
            );

            return;
          }

          const file = {
            uri:
              asset.uri,

            type:
              asset.type ||
              'image/jpeg',

            name:
              asset.fileName ||
              `${
                side ===
                'front'
                  ? 'license-front'
                  : 'license-back'
              }-${Date.now()}.jpg`,
          };

          if (
            side ===
            'front'
          ) {
            setLicenseFrontFile(
              file,
            );

            setEditLicenseFrontPreview(
              asset.uri,
            );
          } else {
            setLicenseBackFile(
              file,
            );

            setEditLicenseBackPreview(
              asset.uri,
            );
          }

          setEditProfileError(
            '',
          );
        } catch (
          error
        ) {
          console.log(
            'IMAGE PICKER ERROR:',
            error,
          );

          Alert.alert(
            'Image Error',

            'Unable to select licence image.',
          );
        }
      };

    const resetFrontImage =
      () => {
        setLicenseFrontFile(
          null,
        );

        setEditLicenseFrontPreview(
          profile.licenseFront ||
          '',
        );
      };

    const resetBackImage =
      () => {
        setLicenseBackFile(
          null,
        );

        setEditLicenseBackPreview(
          profile.licenseBack ||
          '',
        );
      };

    /* =====================================================
     * SAVE PROFILE
     * ===================================================== */

    const saveProfileChanges =
      async () => {
        if (
          editProfileLoading
        ) {
          return;
        }

        const firstName =
          editForm
            .first_name
            .trim();

        const lastName =
          editForm
            .last_name
            .trim();

        const phone =
          editForm
            .phone
            .trim();

        const email =
          editForm
            .email
            .trim();

        const address =
          editForm
            .address
            .trim();

        const vehicleRegNo =
          editForm
            .vehicle_reg_no
            .trim();

        const licenseNo =
          editForm
            .license_no
            .trim();

        const licenseExpiry =
          editForm
            .license_expiry
            .trim();

        const assignedZip =
          editForm
            .assigned_zip
            .trim();

        if (
          !firstName
        ) {
          setEditProfileError(
            'Please enter first name.',
          );

          return;
        }

        if (
          !lastName
        ) {
          setEditProfileError(
            'Please enter last name.',
          );

          return;
        }

        if (
          !phone
        ) {
          setEditProfileError(
            'Please enter phone number.',
          );

          return;
        }

        if (
          !email ||
          !email.includes(
            '@',
          )
        ) {
          setEditProfileError(
            'Please enter a valid email address.',
          );

          return;
        }

        if (
          !address
        ) {
          setEditProfileError(
            'Please enter address.',
          );

          return;
        }

        if (
          !vehicleRegNo
        ) {
          setEditProfileError(
            'Please enter vehicle registration number.',
          );

          return;
        }

        if (
          !licenseNo
        ) {
          setEditProfileError(
            'Please enter licence number.',
          );

          return;
        }

        if (
          !licenseExpiry
        ) {
          setEditProfileError(
            'Please enter licence expiry.',
          );

          return;
        }

        const oldPassword =
          editForm
            .old_password;

        const newPassword =
          editForm
            .new_password;

        const confirmation =
          editForm
            .new_password_confirmation;

        const wantsPasswordChange =
          Boolean(
            oldPassword ||
            newPassword ||
            confirmation,
          );

        if (
          wantsPasswordChange
        ) {
          if (
            !oldPassword ||
            !newPassword ||
            !confirmation
          ) {
            setEditProfileError(
              'Please complete all password fields.',
            );

            return;
          }

          if (
            newPassword !==
            confirmation
          ) {
            setEditProfileError(
              'New password and confirmation do not match.',
            );

            return;
          }
        }

        setEditProfileLoading(
          true,
        );

        setEditProfileError(
          '',
        );

        try {
          const token =
            authToken ||
            await AsyncStorage
              .getItem(
                AUTH_TOKEN_KEY,
              );

          if (
            !token
          ) {
            await handleExpiredSession();

            return;
          }

          const formData =
            new FormData();

          formData.append(
            'first_name',
            firstName,
          );

          formData.append(
            'last_name',
            lastName,
          );

          formData.append(
            'phone',
            phone,
          );

          formData.append(
            'email',
            email,
          );

          formData.append(
            'address',
            address,
          );

          formData.append(
            'vehicle_reg_no',
            vehicleRegNo,
          );

          formData.append(
            'license_no',
            licenseNo,
          );

          formData.append(
            'license_expiry',
            licenseExpiry,
          );

          formData.append(
            'assigned_zip',
            assignedZip,
          );

          if (
            wantsPasswordChange
          ) {
            formData.append(
              'old_password',
              oldPassword,
            );

            formData.append(
              'new_password',
              newPassword,
            );

            formData.append(
              'new_password_confirmation',
              confirmation,
            );
          }

          if (
            licenseFrontFile
          ) {
            formData.append(
              'license_copy_front',
              {
                uri:
                  Platform.OS ===
                  'ios'
                    ? licenseFrontFile
                        .uri
                        .replace(
                          'file://',
                          '',
                        )
                    : licenseFrontFile
                        .uri,

                type:
                  licenseFrontFile
                    .type,

                name:
                  licenseFrontFile
                    .name,
              },
            );
          }

          if (
            licenseBackFile
          ) {
            formData.append(
              'license_copy_back',
              {
                uri:
                  Platform.OS ===
                  'ios'
                    ? licenseBackFile
                        .uri
                        .replace(
                          'file://',
                          '',
                        )
                    : licenseBackFile
                        .uri,

                type:
                  licenseBackFile
                    .type,

                name:
                  licenseBackFile
                    .name,
              },
            );
          }

          const response =
            await axios.post(
              PROFILE_EDIT_API_URL,

              formData,

              {
                headers: {
                  Accept:
                    'application/json',

                  Authorization:
                    `Bearer ${token}`,

                  'Content-Type':
                    'multipart/form-data',
                },

                timeout:
                  60000,
              },
            );

          console.log(
            'PROFILE EDIT RESPONSE:',

            JSON.stringify(
              response?.data,
              null,
              2,
            ),
          );

          if (
            response?.data
              ?.success ===
              false ||
            response?.data
              ?.status ===
              false
          ) {
            throw new Error(
              response?.data
                ?.message ||
              'Unable to update profile.',
            );
          }

          await AsyncStorage
            .setItem(
              AUTH_EMAIL_KEY,
              email,
            );

          setEditProfileVisible(
            false,
          );

          setLicenseFrontFile(
            null,
          );

          setLicenseBackFile(
            null,
          );

          await loadProfile(
            false,
          );

          Alert.alert(
            'Profile Updated',

            response?.data
              ?.message ||
            'Your profile has been updated successfully.',
          );
        } catch (
          error
        ) {
          const status =
            error
              ?.response
              ?.status;

          console.log(
            'PROFILE EDIT ERROR:',

            error
              ?.response
              ?.data ??
            error
              ?.message,
          );

          if (
            status === 401 ||
            status === 403
          ) {
            setEditProfileVisible(
              false,
            );

            await handleExpiredSession();

            return;
          }

          setEditProfileError(
            getApiErrorMessage(
              error,

              'Unable to update profile.',
            ),
          );
        } finally {
          if (
            mountedRef.current
          ) {
            setEditProfileLoading(
              false,
            );
          }
        }
      };

    /* =====================================================
     * OPEN DOCUMENT
     * ===================================================== */

    const openDocument =
      (
        title,
        image,
      ) => {
        if (
          !image
        ) {
          Alert.alert(
            'Document Unavailable',

            `${title} has not been uploaded yet.`,
          );

          return;
        }

        const candidates =
          getImageUrlCandidates(
            image,
          );

        console.log(
          '======================================',
        );

        console.log(
          'OPEN DOCUMENT:',
          title,
        );

        console.log(
          'RAW IMAGE VALUE:',
          image,
        );

        console.log(
          'URL CANDIDATES:',
          candidates,
        );

        console.log(
          '======================================',
        );

        if (
          candidates.length ===
          0
        ) {
          Alert.alert(
            'Document Unavailable',

            'Unable to determine the licence image URL.',
          );

          return;
        }

        setDocumentError(
          false,
        );

        setDocumentLoading(
          true,
        );

        setDocumentPreview({
          visible:
            true,

          title,

          original:
            image,

          candidates,

          index:
            0,
        });
      };

    /* =====================================================
     * DOCUMENT IMAGE ERROR
     * ===================================================== */

    const handleDocumentImageError =
      event => {
        const {
          candidates,
          index,
          title,
        } =
          documentPreview;

        const current =
          candidates[
            index
          ];

        console.log(
          '❌ LICENCE PREVIEW FAILED:',
          {
            title,

            index,

            url:
              current,

            error:
              event
                ?.nativeEvent
                ?.error,
          },
        );

        if (
          index <
          candidates.length -
            1
        ) {
          const nextIndex =
            index + 1;

          console.log(
            'TRYING NEXT LICENCE URL:',
            candidates[
              nextIndex
            ],
          );

          setDocumentLoading(
            true,
          );

          setDocumentError(
            false,
          );

          setDocumentPreview(
            previous => ({
              ...previous,

              index:
                nextIndex,
            }),
          );

          return;
        }

        console.log(
          'ALL LICENCE IMAGE URLS FAILED.',
        );

        setDocumentLoading(
          false,
        );

        setDocumentError(
          true,
        );
      };

    /* =====================================================
     * CLOSE DOCUMENT
     * ===================================================== */

    const closeDocument =
      () => {
        setDocumentPreview({
          visible:
            false,

          title:
            '',

          original:
            '',

          candidates:
            [],

          index:
            0,
        });

        setDocumentLoading(
          false,
        );

        setDocumentError(
          false,
        );
      };

    /* =====================================================
     * LOGOUT
     * ===================================================== */

    const performLogout =
      async () => {
        if (
          logoutLoading
        ) {
          return;
        }

        setLogoutLoading(
          true,
        );

        loggingOutRef
          .current =
          true;

        cancelRequests();

        const token =
          authToken ||
          await AsyncStorage
            .getItem(
              AUTH_TOKEN_KEY,
            );

        await clearLocalSession();

        if (
          token
        ) {
          try {
            await axios.post(
              LOGOUT_API_URL,

              {},

              {
                headers: {
                  Accept:
                    'application/json',

                  Authorization:
                    `Bearer ${token}`,
                },

                timeout:
                  10000,
              },
            );
          } catch (
            error
          ) {
            console.log(
              'LOGOUT API ERROR:',

              error
                ?.response
                ?.data ??
              error
                ?.message,
            );
          }
        }

        setLogoutPopupVisible(
          false,
        );

        redirectToLogin();
      };

    /* =====================================================
     * PROFILE IMAGE
     * ===================================================== */

    const profileImageCandidates =
      getImageUrlCandidates(
        profile.profileImage,
      );

    const profileImageUri =
      profileImageCandidates[
        0
      ] ||
      DEFAULT_PROFILE_IMAGE;

    const profileImageSource =
      profile.profileImage
        ? createImageSource(
            profileImageUri,
            authToken,
          )
        : {
            uri:
              DEFAULT_PROFILE_IMAGE,
          };

    const statusInfo =
      getStatusInfo(
        profile.status,
      );

    const currentDocumentImage =
      documentPreview
        .candidates[
          documentPreview
            .index
        ] ||
      '';

    /* =====================================================
     * LOADING
     * ===================================================== */

    if (
      profileLoading
    ) {
      return (
        <SafeAreaView
          style={
            styles.safeArea
          }
        >
          <StatusBar
            barStyle="dark-content"
            backgroundColor="#f6f7f9"
          />

          <View
            style={
              styles.loadingScreen
            }
          >
            <ActivityIndicator
              size="large"
              color="#a9090d"
            />

            <Text
              style={
                styles.loadingTitle
              }
            >
              Loading Your Profile
            </Text>

            <Text
              style={
                styles.loadingMessage
              }
            >
              Retrieving your driver information.
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    /* =====================================================
     * UI
     * ===================================================== */

    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
        edges={[
          'top',
          'left',
          'right',
        ]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#a9090d"
        />

        <View
          style={
            styles.screen
          }
        >
          {/* HEADER */}

          <View
            style={
              styles.header
            }
          >
            <View
              style={
                styles.headerCircleOne
              }
            />

            <View
              style={
                styles.headerCircleTwo
              }
            />

            <View
              style={
                styles.headerTopRow
              }
            >
              <Pressable
                onPress={() =>
                  navigation
                    .goBack()
                }
                style={
                  styles.headerBackButton
                }
              >
                <Image
                  source={require('../assets/login-icons/back.png')}
                  style={
                    styles.headerBackIcon
                  }
                  resizeMode="contain"
                />
              </Pressable>

              <View
                style={
                  styles.headerTitleArea
                }
              >
                <Text
                  style={
                    styles.headerEyebrow
                  }
                >
                  KP&apos;S KITCHEN
                </Text>

                <Text
                  style={
                    styles.headerTitle
                  }
                >
                  My Profile
                </Text>
              </View>

              <Pressable
                onPress={
                  handleEditProfile
                }
                style={
                  styles.headerEditButton
                }
              >
                <Text
                  style={
                    styles.headerEditIcon
                  }
                >
                  ✎
                </Text>
              </Pressable>
            </View>

            <View
              style={
                styles.headerProfileArea
              }
            >
              <View
                style={
                  styles.headerProfileImageWrapper
                }
              >
                <Image
                  source={
                    profileImageSource
                  }
                  style={
                    styles.headerProfileImage
                  }
                  resizeMode="cover"
                />

                <View
                  style={[
                    styles.onlineBadgeDot,

                    {
                      backgroundColor:
                        statusInfo.dot,
                    },
                  ]}
                />
              </View>

              <View
                style={
                  styles.headerProfileTextArea
                }
              >
                <Text
                  numberOfLines={
                    1
                  }
                  style={
                    styles.headerProfileName
                  }
                >
                  {profile.name ||
                    'Driver'}
                </Text>

                <Text
                  numberOfLines={
                    1
                  }
                  style={
                    styles.headerProfileEmail
                  }
                >
                  {profile.email ||
                    'Email not available'}
                </Text>

                <View
                  style={
                    styles.headerStatusRow
                  }
                >
                  <View
                    style={[
                      styles.headerStatusBadge,

                      {
                        backgroundColor:
                          statusInfo
                            .background,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.headerStatusDot,

                        {
                          backgroundColor:
                            statusInfo.dot,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.headerStatusText,

                        {
                          color:
                            statusInfo.color,
                        },
                      ]}
                    >
                      {
                        statusInfo.label
                      }
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.headerUserType
                    }
                  >
                    {String(
                      profile.userType ||
                        'driver',
                    ).toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* BODY */}

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            refreshControl={
              <RefreshControl
                refreshing={
                  refreshing
                }
                onRefresh={() =>
                  loadProfile(
                    true,
                  )
                }
                colors={[
                  '#a9090d',
                ]}
                tintColor="#a9090d"
              />
            }
            contentContainerStyle={{
              paddingHorizontal:
                horizontalPadding,

              paddingTop:
                17,

              paddingBottom:
                80,
            }}
          >
            {!!profileError && (
              <View
                style={
                  styles.errorCard
                }
              >
                <Text
                  style={
                    styles.errorTitle
                  }
                >
                  Unable to Load Profile
                </Text>

                <Text
                  style={
                    styles.errorMessage
                  }
                >
                  {
                    profileError
                  }
                </Text>
              </View>
            )}

            {/* DRIVER DETAILS */}

            <View
              style={
                styles.driverDetailsCard
              }
            >
              <Text
                style={
                  styles.cardTitle
                }
              >
                Driver Details
              </Text>

              <Text
                style={
                  styles.cardSubtitle
                }
              >
                Your personal information
              </Text>

              <View
                style={
                  styles.cardDivider
                }
              />

              <ProfileInfoRow
                icon="F"
                label="FIRST NAME"
                value={
                  profile.firstName ||
                  'Not available'
                }
              />

              <View
                style={
                  styles.rowDivider
                }
              />

              <ProfileInfoRow
                icon="L"
                label="LAST NAME"
                value={
                  profile.lastName ||
                  'Not available'
                }
              />

              <View
                style={
                  styles.rowDivider
                }
              />

              <ProfileInfoRow
                icon="@"
                label="EMAIL"
                value={
                  profile.email ||
                  'Not available'
                }
              />

              <View
                style={
                  styles.rowDivider
                }
              />

              <ProfileInfoRow
                icon="☎"
                label="PHONE"
                value={
                  profile.phone ||
                  'Not available'
                }
              />

              <View
                style={
                  styles.rowDivider
                }
              />

              <ProfileInfoRow
                icon="⌖"
                label="ADDRESS"
                multiline
                value={
                  profile.address ||
                  'Not available'
                }
              />
            </View>

            {/* PERFORMANCE */}

            <Text
              style={
                styles.sectionTitle
              }
            >
              Delivery Performance
            </Text>

            <View
              style={[
                styles.performanceRow,

                {
                  columnGap:
                    cardGap,
                },
              ]}
            >
              <Pressable
                onPress={() =>
                  navigation
                    .navigate(
                      'TotalOrder',
                    )
                }
                style={
                  styles.performanceCard
                }
              >
                <Text
                  style={
                    styles.performanceLabel
                  }
                >
                  TOTAL ASSIGNED
                </Text>

                <Text
                  style={
                    styles.performanceValue
                  }
                >
                  {
                    profile
                      .totalAssignedOrders
                  }
                </Text>
              </Pressable>

              <View
                style={
                  styles.performanceCard
                }
              >
                <Text
                  style={
                    styles.performanceLabel
                  }
                >
                  ACTIVE SHIPMENTS
                </Text>

                <Text
                  style={
                    styles.performanceValue
                  }
                >
                  {
                    profile
                      .activeShipments
                  }
                </Text>
              </View>
            </View>

            {/* ASSIGNMENT */}

            <Text
              style={
                styles.sectionTitle
              }
            >
              Delivery Assignment
            </Text>

            <View
              style={[
                styles.performanceRow,

                {
                  columnGap:
                    cardGap,
                },
              ]}
            >
              <View
                style={
                  styles.performanceCard
                }
              >
                <Text
                  style={
                    styles.performanceLabel
                  }
                >
                  ASSIGNED ZIP
                </Text>

                <Text
                  style={
                    styles.smallDetailValue
                  }
                >
                  {profile.assignedZip ||
                    'N/A'}
                </Text>
              </View>

              <View
                style={
                  styles.performanceCard
                }
              >
                <Text
                  style={
                    styles.performanceLabel
                  }
                >
                  VEHICLE NUMBER
                </Text>

                <Text
                  style={
                    styles.smallDetailValue
                  }
                >
                  {profile.vehicleNumber ||
                    'N/A'}
                </Text>
              </View>
            </View>

            {/* DRIVING LICENCE */}

            <Text
              style={
                styles.sectionTitle
              }
            >
              Driving Licence
            </Text>

            <View
              style={
                styles.driverDetailsCard
              }
            >
              <ProfileInfoRow
                icon="ID"
                label="LICENCE NUMBER"
                value={
                  profile.licenseNumber ||
                  'Not available'
                }
              />

              <View
                style={
                  styles.rowDivider
                }
              />

              <ProfileInfoRow
                icon="D"
                label="LICENCE EXPIRY"
                value={
                  formatDate(
                    profile.licenseExpiry,
                  )
                }
              />
            </View>

            <View
              style={
                styles.documentsContainer
              }
            >
              <DocumentCard
                title="Licence Front"
                subtitle="Tap to preview full licence"
                imageValue={
                  profile.licenseFront
                }
                authToken={
                  authToken
                }
                onPress={() =>
                  openDocument(
                    'Licence Front',

                    profile
                      .licenseFront,
                  )
                }
              />

              <DocumentCard
                title="Licence Back"
                subtitle="Tap to preview full licence"
                imageValue={
                  profile.licenseBack
                }
                authToken={
                  authToken
                }
                onPress={() =>
                  openDocument(
                    'Licence Back',

                    profile
                      .licenseBack,
                  )
                }
              />
            </View>

            {/* LOGOUT */}

            <Pressable
              onPress={() =>
                setLogoutPopupVisible(
                  true,
                )
              }
              style={
                styles.logoutButton
              }
            >
              <Text
                style={
                  styles.logoutTitle
                }
              >
                Logout
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* =================================================
            EDIT PROFILE
        ================================================= */}

        <Modal
          visible={
            editProfileVisible
          }
          transparent
          statusBarTranslucent
          animationType="fade"
          onRequestClose={
            closeEditProfile
          }
        >
          <KeyboardAvoidingView
            style={
              styles.editModalOverlay
            }
            behavior={
              Platform.OS ===
              'ios'
                ? 'padding'
                : undefined
            }
          >
            <Pressable
              style={
                StyleSheet
                  .absoluteFillObject
              }
              disabled={
                editProfileLoading
              }
              onPress={
                closeEditProfile
              }
            />

            <View
              style={
                styles.editModalCard
              }
            >
              <View
                style={
                  styles.editModalHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.editModalEyebrow
                    }
                  >
                    DRIVER ACCOUNT
                  </Text>

                  <Text
                    style={
                      styles.editModalTitle
                    }
                  >
                    Edit Profile
                  </Text>
                </View>

                <Pressable
                  disabled={
                    editProfileLoading
                  }
                  onPress={
                    closeEditProfile
                  }
                  style={
                    styles.editModalClose
                  }
                >
                  <Text
                    style={
                      styles.editModalCloseText
                    }
                  >
                    ×
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={
                  styles.editFormContent
                }
              >
                {!!editProfileError && (
                  <View
                    style={
                      styles.editErrorBox
                    }
                  >
                    <Text
                      style={
                        styles.editErrorText
                      }
                    >
                      {
                        editProfileError
                      }
                    </Text>
                  </View>
                )}

                <Text
                  style={
                    styles.editSectionTitle
                  }
                >
                  Personal Information
                </Text>

                <EditField
                  label="First Name"
                  required
                  value={
                    editForm
                      .first_name
                  }
                  onChangeText={
                    value =>
                      updateEditField(
                        'first_name',
                        value,
                      )
                  }
                  placeholder="First name"
                />

                <EditField
                  label="Last Name"
                  required
                  value={
                    editForm
                      .last_name
                  }
                  onChangeText={
                    value =>
                      updateEditField(
                        'last_name',
                        value,
                      )
                  }
                  placeholder="Last name"
                />

                <EditField
                  label="Phone"
                  required
                  value={
                    editForm.phone
                  }
                  onChangeText={
                    value =>
                      updateEditField(
                        'phone',
                        value,
                      )
                  }
                  placeholder="Phone"
                  keyboardType="phone-pad"
                />

                <EditField
                  label="Email"
                  required
                  value={
                    editForm.email
                  }
                  onChangeText={
                    value =>
                      updateEditField(
                        'email',
                        value,
                      )
                  }
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <EditField
                  label="Address"
                  required
                  multiline
                  value={
                    editForm.address
                  }
                  onChangeText={
                    value =>
                      updateEditField(
                        'address',
                        value,
                      )
                  }
                  placeholder="Address"
                />

                <Text
                  style={
                    styles.editSectionTitle
                  }
                >
                  Driver Information
                </Text>

                <EditField
                  label="Vehicle Registration"
                  required
                  value={
                    editForm
                      .vehicle_reg_no
                  }
                  onChangeText={
                    value =>
                      updateEditField(
                        'vehicle_reg_no',
                        value,
                      )
                  }
                  placeholder="SA-00-TOP"
                  autoCapitalize="characters"
                />

                <EditField
                  label="Licence Number"
                  required
                  value={
                    editForm
                      .license_no
                  }
                  onChangeText={
                    value =>
                      updateEditField(
                        'license_no',
                        value,
                      )
                  }
                  placeholder="DL-112233"
                  autoCapitalize="characters"
                />

                <EditField
                  label="Licence Expiry"
                  required
                  value={
                    editForm
                      .license_expiry
                  }
                  onChangeText={
                    value =>
                      updateEditField(
                        'license_expiry',
                        value,
                      )
                  }
                  placeholder="2030-01-01"
                  autoCapitalize="none"
                />

                <EditField
                  label="Assigned ZIP"
                  value={
                    editForm
                      .assigned_zip
                  }
                  onChangeText={
                    value =>
                      updateEditField(
                        'assigned_zip',
                        value,
                      )
                  }
                  placeholder="5000, 5001"
                />

                {/* LICENCE PHOTOS */}

                <Text
                  style={
                    styles.editSectionTitle
                  }
                >
                  Driving Licence Photos
                </Text>

                <EditLicenseImage
                  title="Licence Front"
                  imageUri={
                    editLicenseFrontPreview
                  }
                  authToken={
                    authToken
                  }
                  isNewImage={
                    Boolean(
                      licenseFrontFile,
                    )
                  }
                  onPress={() =>
                    pickLicenseImage(
                      'front',
                    )
                  }
                  onReset={
                    resetFrontImage
                  }
                />

                <EditLicenseImage
                  title="Licence Back"
                  imageUri={
                    editLicenseBackPreview
                  }
                  authToken={
                    authToken
                  }
                  isNewImage={
                    Boolean(
                      licenseBackFile,
                    )
                  }
                  onPress={() =>
                    pickLicenseImage(
                      'back',
                    )
                  }
                  onReset={
                    resetBackImage
                  }
                />

                {/* PASSWORD */}

                <Text
                  style={
                    styles.editSectionTitle
                  }
                >
                  Change Password
                </Text>

                <Text
                  style={
                    styles.passwordHint
                  }
                >
                  Leave password fields empty if you do not want to change your password.
                </Text>

                <EditField
                  label="Current Password"
                  value={
                    editForm
                      .old_password
                  }
                  onChangeText={
                    value =>
                      updateEditField(
                        'old_password',
                        value,
                      )
                  }
                  placeholder="Current password"
                  secureTextEntry
                  autoCapitalize="none"
                />

                <EditField
                  label="New Password"
                  value={
                    editForm
                      .new_password
                  }
                  onChangeText={
                    value =>
                      updateEditField(
                        'new_password',
                        value,
                      )
                  }
                  placeholder="New password"
                  secureTextEntry
                  autoCapitalize="none"
                />

                <EditField
                  label="Confirm New Password"
                  value={
                    editForm
                      .new_password_confirmation
                  }
                  onChangeText={
                    value =>
                      updateEditField(
                        'new_password_confirmation',
                        value,
                      )
                  }
                  placeholder="Confirm new password"
                  secureTextEntry
                  autoCapitalize="none"
                />

                <Pressable
                  disabled={
                    editProfileLoading
                  }
                  onPress={
                    saveProfileChanges
                  }
                  style={[
                    styles.saveButton,

                    editProfileLoading &&
                      {
                        opacity:
                          0.65,
                      },
                  ]}
                >
                  {editProfileLoading ? (
                    <View
                      style={
                        styles.saveLoadingRow
                      }
                    >
                      <ActivityIndicator
                        color="#ffffff"
                        size="small"
                      />

                      <Text
                        style={
                          styles.saveButtonText
                        }
                      >
                        Saving...
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      Save Changes
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* =================================================
            LICENCE PREVIEW
        ================================================= */}

        <Modal
          visible={
            documentPreview
              .visible
          }
          transparent
          statusBarTranslucent
          animationType="fade"
          onRequestClose={
            closeDocument
          }
        >
          <View
            style={
              styles.imageModalOverlay
            }
          >
            <Pressable
              style={
                StyleSheet
                  .absoluteFillObject
              }
              onPress={
                closeDocument
              }
            />

            <View
              style={
                styles.imageModalCard
              }
            >
              {/* HEADER */}

              <View
                style={
                  styles.imageModalHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.imageModalEyebrow
                    }
                  >
                    DRIVING LICENCE
                  </Text>

                  <Text
                    style={
                      styles.imageModalTitle
                    }
                  >
                    {
                      documentPreview
                        .title
                    }
                  </Text>
                </View>

                <Pressable
                  onPress={
                    closeDocument
                  }
                  style={
                    styles.imageModalCloseButton
                  }
                >
                  <Text
                    style={
                      styles.imageModalCloseText
                    }
                  >
                    ×
                  </Text>
                </Pressable>
              </View>

              {/* IMAGE */}

              <View
                style={
                  styles.fullLicenseImageContainer
                }
              >
                {documentLoading &&
                !documentError && (
                  <View
                    style={
                      styles.documentLoader
                    }
                  >
                    <ActivityIndicator
                      size="large"
                      color="#ffffff"
                    />

                    <Text
                      style={
                        styles.documentLoaderText
                      }
                    >
                      Loading licence...
                    </Text>
                  </View>
                )}

                {documentError ? (
                  <View
                    style={
                      styles.documentErrorState
                    }
                  >
                    <View
                      style={
                        styles.documentErrorCircle
                      }
                    >
                      <Text
                        style={
                          styles.documentErrorIcon
                        }
                      >
                        !
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.documentErrorTitle
                      }
                    >
                      Unable to Load Image
                    </Text>

                    <Text
                      style={
                        styles.documentErrorText
                      }
                    >
                      None of the available licence image URLs could be loaded.
                    </Text>
                  </View>
                ) : (
                  !!currentDocumentImage && (
                    <Image
                      key={
                        currentDocumentImage
                      }
                      source={
                        createImageSource(
                          currentDocumentImage,
                          authToken,
                        )
                      }
                      style={
                        styles.imageModalImage
                      }
                      resizeMode="contain"
                      onLoadStart={() => {
                        console.log(
                          'LICENCE LOAD START:',

                          currentDocumentImage,
                        );

                        setDocumentLoading(
                          true,
                        );
                      }}
                      onLoad={() => {
                        console.log(
                          '✅ LICENCE PREVIEW LOADED:',

                          currentDocumentImage,
                        );

                        setDocumentLoading(
                          false,
                        );

                        setDocumentError(
                          false,
                        );
                      }}
                      onError={
                        handleDocumentImageError
                      }
                    />
                  )
                )}
              </View>

              {/* FOOTER */}

              <View
                style={
                  styles.imageModalFooter
                }
              >
                <View
                  style={{
                    flex:
                      1,
                  }}
                >
                  <Text
                    style={
                      styles.imageModalFooterLabel
                    }
                  >
                    DOCUMENT
                  </Text>

                  <Text
                    style={
                      styles.imageModalFooterText
                    }
                  >
                    {
                      documentPreview
                        .title
                    }
                  </Text>
                </View>

                <Pressable
                  onPress={
                    closeDocument
                  }
                  style={
                    styles.imageModalDoneButton
                  }
                >
                  <Text
                    style={
                      styles.imageModalDoneText
                    }
                  >
                    Done
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* =================================================
            LOGOUT
        ================================================= */}

        <Modal
          visible={
            logoutPopupVisible
          }
          transparent
          statusBarTranslucent
          animationType="fade"
          onRequestClose={() =>
            setLogoutPopupVisible(
              false,
            )
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <Pressable
              style={
                StyleSheet
                  .absoluteFillObject
              }
              onPress={() =>
                setLogoutPopupVisible(
                  false,
                )
              }
            />

            <View
              style={
                styles.modalCard
              }
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                Confirm Logout
              </Text>

              <Text
                style={
                  styles.modalMessage
                }
              >
                Are you sure you want to logout?
              </Text>

              <View
                style={
                  styles.modalButtons
                }
              >
                <Pressable
                  disabled={
                    logoutLoading
                  }
                  onPress={() =>
                    setLogoutPopupVisible(
                      false,
                    )
                  }
                  style={
                    styles.cancelButton
                  }
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  disabled={
                    logoutLoading
                  }
                  onPress={
                    performLogout
                  }
                  style={
                    styles.confirmButton
                  }
                >
                  {logoutLoading ? (
                    <ActivityIndicator
                      color="#ffffff"
                    />
                  ) : (
                    <Text
                      style={
                        styles.confirmButtonText
                      }
                    >
                      Yes, Logout
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  };

export default ProfileScreen;

/* =========================================================
 * STYLES
 * ========================================================= */

const styles =
  StyleSheet.create({
    safeArea: {
      flex:
        1,

      backgroundColor:
        '#a9090d',
    },

    screen: {
      flex:
        1,

      backgroundColor:
        '#f6f7f9',
    },

    /* HEADER */

    header: {
      minHeight:
        250,

      backgroundColor:
        '#a9090d',

      paddingHorizontal:
        17,

      paddingTop:
        12,

      paddingBottom:
        27,

      borderBottomLeftRadius:
        30,

      borderBottomRightRadius:
        30,

      overflow:
        'hidden',
    },

    headerCircleOne: {
      position:
        'absolute',

      width:
        200,

      height:
        200,

      borderRadius:
        100,

      borderWidth:
        1,

      borderColor:
        'rgba(255,255,255,0.09)',

      top:
        -85,

      right:
        -65,
    },

    headerCircleTwo: {
      position:
        'absolute',

      width:
        140,

      height:
        140,

      borderRadius:
        70,

      backgroundColor:
        'rgba(255,255,255,0.035)',

      bottom:
        -70,

      left:
        -30,
    },

    headerTopRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    headerBackButton: {
      width:
        42,

      height:
        42,

      borderRadius:
        13,

      backgroundColor:
        'rgba(255,255,255,0.13)',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerBackIcon: {
      width:
        18,

      height:
        18,

      tintColor:
        '#ffffff',
    },

    headerTitleArea: {
      flex:
        1,

      marginLeft:
        12,
    },

    headerEyebrow: {
      color:
        '#f4c454',

      fontSize:
        9,

      fontWeight:
        '900',

      letterSpacing:
        1,
    },

    headerTitle: {
      color:
        '#ffffff',

      fontSize:
        22,

      fontWeight:
        '900',

      marginTop:
        2,
    },

    headerEditButton: {
      width:
        42,

      height:
        42,

      borderRadius:
        13,

      backgroundColor:
        'rgba(255,255,255,0.13)',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerEditIcon: {
      color:
        '#ffffff',

      fontSize:
        19,

      fontWeight:
        '900',
    },

    headerProfileArea: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        27,
    },

    headerProfileImageWrapper: {
      position:
        'relative',
    },

    headerProfileImage: {
      width:
        84,

      height:
        84,

      borderRadius:
        24,

      borderWidth:
        3,

      borderColor:
        '#ffffff',

      backgroundColor:
        '#e8e8e8',
    },

    onlineBadgeDot: {
      position:
        'absolute',

      width:
        16,

      height:
        16,

      borderRadius:
        8,

      right:
        1,

      bottom:
        3,

      borderWidth:
        3,

      borderColor:
        '#a9090d',
    },

    headerProfileTextArea: {
      flex:
        1,

      marginLeft:
        14,

      minWidth:
        0,
    },

    headerProfileName: {
      color:
        '#ffffff',

      fontSize:
        23,

      fontWeight:
        '900',
    },

    headerProfileEmail: {
      color:
        'rgba(255,255,255,0.78)',

      fontSize:
        11,

      marginTop:
        4,
    },

    headerStatusRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        9,
    },

    headerStatusBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        9,

      paddingVertical:
        5,

      borderRadius:
        20,
    },

    headerStatusDot: {
      width:
        7,

      height:
        7,

      borderRadius:
        4,

      marginRight:
        5,
    },

    headerStatusText: {
      fontSize:
        9,

      fontWeight:
        '900',
    },

    headerUserType: {
      color:
        'rgba(255,255,255,0.72)',

      fontSize:
        8,

      fontWeight:
        '900',

      marginLeft:
        8,
    },

    /* CARDS */

    driverDetailsCard: {
      backgroundColor:
        '#ffffff',

      borderRadius:
        17,

      padding:
        15,

      borderWidth:
        1,

      borderColor:
        '#e9ebee',

      elevation:
        2,
    },

    cardTitle: {
      color:
        '#17191d',

      fontSize:
        17,

      fontWeight:
        '900',
    },

    cardSubtitle: {
      color:
        '#89909a',

      fontSize:
        10,

      marginTop:
        3,
    },

    cardDivider: {
      height:
        1,

      backgroundColor:
        '#f0f1f3',

      marginVertical:
        13,
    },

    rowDivider: {
      height:
        1,

      backgroundColor:
        '#f1f2f4',

      marginLeft:
        53,
    },

    cardPressed: {
      opacity:
        0.7,
    },

    /* PROFILE */

    profileInfoRow: {
      minHeight:
        60,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    profileInfoIcon: {
      width:
        42,

      height:
        42,

      borderRadius:
        12,

      backgroundColor:
        '#fff0f1',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        11,
    },

    profileInfoIconText: {
      color:
        '#a9090d',

      fontSize:
        13,

      fontWeight:
        '900',
    },

    profileInfoContent: {
      flex:
        1,

      minWidth:
        0,
    },

    infoLabel: {
      color:
        '#9298a1',

      fontSize:
        8.5,

      fontWeight:
        '900',

      letterSpacing:
        0.5,
    },

    profileInfoValue: {
      color:
        '#24272d',

      fontSize:
        14,

      fontWeight:
        '800',

      marginTop:
        4,

      lineHeight:
        19,
    },

    /* SECTION */

    sectionTitle: {
      color:
        '#17191d',

      fontSize:
        17,

      fontWeight:
        '900',

      marginTop:
        22,

      marginBottom:
        10,
    },

    /* PERFORMANCE */

    performanceRow: {
      flexDirection:
        'row',
    },

    performanceCard: {
      flex:
        1,

      minHeight:
        110,

      backgroundColor:
        '#ffffff',

      borderRadius:
        16,

      borderWidth:
        1,

      borderColor:
        '#e9ebee',

      padding:
        14,

      elevation:
        2,
    },

    performanceLabel: {
      color:
        '#8d949f',

      fontSize:
        8.5,

      fontWeight:
        '900',
    },

    performanceValue: {
      color:
        '#17191d',

      fontSize:
        29,

      fontWeight:
        '900',

      marginTop:
        7,
    },

    smallDetailValue: {
      color:
        '#17191d',

      fontSize:
        15,

      fontWeight:
        '900',

      marginTop:
        7,
    },

    /* DOCUMENTS */

    documentsContainer: {
      marginTop:
        10,

      rowGap:
        10,
    },

    documentCard: {
      minHeight:
        86,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#ffffff',

      borderRadius:
        15,

      borderWidth:
        1,

      borderColor:
        '#e9ebee',

      padding:
        11,

      elevation:
        1,
    },

    documentCardUnavailable: {
      opacity:
        0.6,
    },

    documentPreview: {
      width:
        72,

      height:
        58,

      borderRadius:
        11,

      backgroundColor:
        '#f2f3f5',

      overflow:
        'hidden',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        11,
    },

    documentImage: {
      width:
        '100%',

      height:
        '100%',
    },

    documentPlaceholderBox: {
      flex:
        1,

      width:
        '100%',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    documentIconCircle: {
      width:
        40,

      height:
        40,

      borderRadius:
        11,

      backgroundColor:
        '#fff0f1',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    documentIconText: {
      color:
        '#a9090d',

      fontSize:
        11,

      fontWeight:
        '900',
    },

    documentContent: {
      flex:
        1,

      minWidth:
        0,
    },

    documentTitle: {
      color:
        '#202329',

      fontSize:
        13,

      fontWeight:
        '900',
    },

    documentSubtitle: {
      color:
        '#8b919a',

      fontSize:
        9.5,

      lineHeight:
        14,

      marginTop:
        3,
    },

    documentArrowBox: {
      width:
        34,

      height:
        34,

      borderRadius:
        10,

      backgroundColor:
        '#fff0f1',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    documentArrow: {
      color:
        '#a9090d',

      fontSize:
        23,
    },

    /* LOGOUT */

    logoutButton: {
      minHeight:
        62,

      backgroundColor:
        '#a9090d',

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginTop:
        25,

      marginBottom:
        20,
    },

    logoutTitle: {
      color:
        '#ffffff',

      fontSize:
        14,

      fontWeight:
        '900',
    },

    /* LOADING */

    loadingScreen: {
      flex:
        1,

      backgroundColor:
        '#f6f7f9',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    loadingTitle: {
      color:
        '#17191d',

      fontSize:
        20,

      fontWeight:
        '900',

      marginTop:
        15,
    },

    loadingMessage: {
      color:
        '#777f8c',

      fontSize:
        11,

      marginTop:
        5,
    },

    /* ERRORS */

    errorCard: {
      backgroundColor:
        '#fff1f2',

      borderRadius:
        14,

      padding:
        14,

      marginBottom:
        15,
    },

    errorTitle: {
      color:
        '#9f1239',

      fontSize:
        14,

      fontWeight:
        '900',
    },

    errorMessage: {
      color:
        '#881337',

      fontSize:
        11,

      marginTop:
        4,
    },

    /* EDIT */

    editModalOverlay: {
      flex:
        1,

      backgroundColor:
        'rgba(17,24,39,0.72)',

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        16,
    },

    editModalCard: {
      width:
        '100%',

      maxWidth:
        520,

      maxHeight:
        '94%',

      backgroundColor:
        '#f6f7f9',

      borderRadius:
        24,

      overflow:
        'hidden',
    },

    editModalHeader: {
      backgroundColor:
        '#a9090d',

      minHeight:
        100,

      padding:
        20,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    editModalEyebrow: {
      color:
        '#f4c454',

      fontSize:
        8,

      fontWeight:
        '900',

      letterSpacing:
        1,
    },

    editModalTitle: {
      color:
        '#ffffff',

      fontSize:
        22,

      fontWeight:
        '900',

      marginTop:
        3,
    },

    editModalClose: {
      width:
        38,

      height:
        38,

      borderRadius:
        12,

      backgroundColor:
        'rgba(255,255,255,0.15)',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    editModalCloseText: {
      color:
        '#ffffff',

      fontSize:
        26,
    },

    editFormContent: {
      padding:
        18,

      paddingBottom:
        40,
    },

    editSectionTitle: {
      color:
        '#17191d',

      fontSize:
        16,

      fontWeight:
        '900',

      marginTop:
        14,

      marginBottom:
        12,
    },

    editField: {
      marginBottom:
        14,
    },

    editFieldLabel: {
      color:
        '#4b5563',

      fontSize:
        10,

      fontWeight:
        '900',

      marginBottom:
        7,
    },

    requiredText: {
      color:
        '#a9090d',
    },

    editInput: {
      minHeight:
        50,

      backgroundColor:
        '#ffffff',

      borderWidth:
        1,

      borderColor:
        '#dedfe2',

      borderRadius:
        12,

      paddingHorizontal:
        13,

      color:
        '#17191d',

      fontSize:
        13,
    },

    editInputMultiline: {
      minHeight:
        90,

      paddingTop:
        13,

      textAlignVertical:
        'top',
    },

    editErrorBox: {
      backgroundColor:
        '#fff1f2',

      borderRadius:
        12,

      padding:
        12,

      marginBottom:
        12,
    },

    editErrorText: {
      color:
        '#9f1239',

      fontSize:
        11,
    },

    passwordHint: {
      color:
        '#737b87',

      fontSize:
        10,

      lineHeight:
        16,

      marginBottom:
        13,
    },

    /* EDIT IMAGE */

    editImageSection: {
      marginBottom:
        18,
    },

    editImagePicker: {
      backgroundColor:
        '#ffffff',

      borderWidth:
        1,

      borderColor:
        '#dedfe2',

      borderRadius:
        15,

      overflow:
        'hidden',
    },

    editImagePreview: {
      width:
        '100%',

      height:
        180,

      backgroundColor:
        '#111111',
    },

    editImagePlaceholder: {
      height:
        150,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#fafafa',
    },

    editImagePlaceholderIcon: {
      color:
        '#a9090d',

      fontSize:
        30,

      fontWeight:
        '900',
    },

    editImagePlaceholderTitle: {
      color:
        '#565e6b',

      fontSize:
        11,

      fontWeight:
        '800',

      marginTop:
        5,
    },

    editImageBottom: {
      minHeight:
        44,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#fff0f1',
    },

    editImageButtonText: {
      color:
        '#a9090d',

      fontSize:
        10,

      fontWeight:
        '900',
    },

    resetImageButton: {
      alignSelf:
        'flex-start',

      paddingVertical:
        8,
    },

    resetImageButtonText: {
      color:
        '#a9090d',

      fontSize:
        9.5,

      fontWeight:
        '800',
    },

    saveButton: {
      minHeight:
        54,

      backgroundColor:
        '#a9090d',

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginTop:
        15,
    },

    saveLoadingRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    saveButtonText: {
      color:
        '#ffffff',

      fontSize:
        12,

      fontWeight:
        '900',

      marginLeft:
        7,
    },

    /* LICENCE PREVIEW */

    imageModalOverlay: {
      flex:
        1,

      backgroundColor:
        'rgba(0,0,0,0.90)',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        14,

      paddingVertical:
        30,
    },

    imageModalCard: {
      width:
        '100%',

      maxWidth:
        560,

      backgroundColor:
        '#ffffff',

      borderRadius:
        22,

      overflow:
        'hidden',
    },

    imageModalHeader: {
      minHeight:
        72,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      backgroundColor:
        '#a9090d',

      paddingHorizontal:
        17,

      paddingVertical:
        13,
    },

    imageModalEyebrow: {
      color:
        '#f4c454',

      fontSize:
        8,

      fontWeight:
        '900',

      letterSpacing:
        0.8,
    },

    imageModalTitle: {
      color:
        '#ffffff',

      fontSize:
        17,

      fontWeight:
        '900',

      marginTop:
        2,
    },

    imageModalCloseButton: {
      width:
        38,

      height:
        38,

      borderRadius:
        12,

      backgroundColor:
        'rgba(255,255,255,0.15)',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    imageModalCloseText: {
      color:
        '#ffffff',

      fontSize:
        27,

      lineHeight:
        29,
    },

    fullLicenseImageContainer: {
      width:
        '100%',

      height:
        420,

      backgroundColor:
        '#111111',

      alignItems:
        'center',

      justifyContent:
        'center',

      position:
        'relative',
    },

    imageModalImage: {
      width:
        '100%',

      height:
        '100%',
    },

    documentLoader: {
      ...StyleSheet
        .absoluteFillObject,

      zIndex:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#111111',
    },

    documentLoaderText: {
      color:
        '#ffffff',

      fontSize:
        10,

      fontWeight:
        '800',

      marginTop:
        10,
    },

    documentErrorState: {
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,
    },

    documentErrorCircle: {
      width:
        48,

      height:
        48,

      borderRadius:
        24,

      backgroundColor:
        '#d00000',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    documentErrorIcon: {
      color:
        '#ffffff',

      fontSize:
        24,

      fontWeight:
        '900',
    },

    documentErrorTitle: {
      color:
        '#ffffff',

      fontSize:
        15,

      fontWeight:
        '900',

      marginTop:
        14,
    },

    documentErrorText: {
      color:
        '#b7bbc2',

      fontSize:
        10,

      lineHeight:
        15,

      textAlign:
        'center',

      marginTop:
        6,
    },

    imageModalFooter: {
      minHeight:
        66,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        16,
    },

    imageModalFooterLabel: {
      color:
        '#9ca3af',

      fontSize:
        7,

      fontWeight:
        '900',

      letterSpacing:
        0.7,
    },

    imageModalFooterText: {
      color:
        '#25282d',

      fontSize:
        12,

      fontWeight:
        '900',

      marginTop:
        2,
    },

    imageModalDoneButton: {
      minWidth:
        80,

      height:
        40,

      borderRadius:
        11,

      backgroundColor:
        '#a9090d',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    imageModalDoneText: {
      color:
        '#ffffff',

      fontSize:
        10,

      fontWeight:
        '900',
    },

    /* LOGOUT MODAL */

    modalOverlay: {
      flex:
        1,

      backgroundColor:
        'rgba(17,24,39,0.68)',

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        24,
    },

    modalCard: {
      width:
        '100%',

      maxWidth:
        380,

      backgroundColor:
        '#ffffff',

      borderRadius:
        24,

      padding:
        24,
    },

    modalTitle: {
      color:
        '#17191d',

      fontSize:
        22,

      fontWeight:
        '900',

      textAlign:
        'center',
    },

    modalMessage: {
      color:
        '#6b7280',

      fontSize:
        13,

      textAlign:
        'center',

      marginVertical:
        20,
    },

    modalButtons: {
      flexDirection:
        'row',

      columnGap:
        10,
    },

    cancelButton: {
      flex:
        1,

      minHeight:
        50,

      borderWidth:
        1,

      borderColor:
        '#d1d5db',

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    cancelButtonText: {
      color:
        '#4b5563',

      fontSize:
        12,

      fontWeight:
        '800',
    },

    confirmButton: {
      flex:
        1,

      minHeight:
        50,

      backgroundColor:
        '#a9090d',

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    confirmButtonText: {
      color:
        '#ffffff',

      fontSize:
        12,

      fontWeight:
        '900',
    },
  });
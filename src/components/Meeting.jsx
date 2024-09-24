import { Box, Button, Snackbar, TextField, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import CircularProgress from "@mui/material/CircularProgress";

const ZOHO = window.ZOHO;
dayjs.extend(utc);
dayjs.extend(timezone);
const Meeting = () => {
  const [initialized, setInitialized] = useState(false);
  const [entity, setEntity] = useState(null);
  const [entityID, setEntityID] = useState(null);
  const [dealData, setDealData] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [contact, setContact] = useState(null);
  const [startDateTime, setStartDateTime] = useState(null);
  const [endDateTime, setEndDateTime] = useState(null);
  const [location, setLocation] = useState(""); // State for location
  const [title, setTitle] = useState("");
  const [errorLocation, setErrorLocation] = useState(false);
  const [errorTitle, setErrorTitle] = useState(false);
  const [errorStartDateTime, setErrorStartDateTime] = useState(false);
  const [errorEndDateTime, setErrorEndDateTime] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const handleStartChange = (newValue) => {
    setStartDateTime(newValue);
    if (endDateTime && newValue && newValue.isAfter(endDateTime)) {
      setEndDateTime(newValue);
    }
  };

  const handleEndChange = (newValue) => {
    if (startDateTime && newValue && newValue.isBefore(startDateTime)) {
      setSnackbarMessage("End Date-Time cannot be before Start Date-Time");
      setSnackbarOpen(true);
    } else {
      setEndDateTime(newValue);
    }
  };

  const handleCreateMeeting = async () => {
    // Reset error states before validation
    setErrorLocation(false);
    setErrorTitle(false);
    setErrorStartDateTime(false);
    setErrorEndDateTime(false);

    let isValid = true;

    // Check if fields are filled
    if (!location) {
      setErrorLocation(true);
      isValid = false;
    }
    if (!title) {
      setErrorTitle(true);
      isValid = false;
    }
    if (!startDateTime) {
      setErrorStartDateTime(true);
      isValid = false;
    }
    if (!endDateTime) {
      setErrorEndDateTime(true);
      isValid = false;
    }

    // Check if the end date-time is before the start date-time
    if (
      startDateTime &&
      endDateTime &&
      (dayjs(endDateTime).isBefore(dayjs(startDateTime)) ||
        dayjs(endDateTime).isSame(dayjs(startDateTime)))
    ) {
      // Trigger the Snackbar with the error message
      setSnackbarMessage("End Date-Time cannot be before Start Date-Time");
      setSnackbarOpen(true);
      setErrorEndDateTime(true); // Set the error for the end date-time
      isValid = false; // Set isValid to false to prevent submission
    }

    // Stop execution if validation fails
    if (!isValid) {
      return; // Prevents insertRecord from being triggered
    }

    // Proceed with the meeting creation only if all fields are valid
    const candidate_res = candidate
      ? { name: candidate.Name, id: candidate.id }
      : null;
    const participants = [
      contact && dealData?.Contact_Name
        ? {
            Email: contact.Email,
            name: dealData.Contact_Name.name,
            type: "contact",
            participant: contact.id,
          }
        : null,
    ].filter(Boolean);

    const meetingDetails = {
      Event_Title: title,
      Venue: location,
      Participants: participants,
      What_Id: candidate_res,
      Start_DateTime: startDateTime
        ? dayjs(startDateTime)
            .tz("America/New_York")
            .format("YYYY-MM-DDTHH:mm:ssZ")
        : null,
      End_DateTime: endDateTime
        ? dayjs(endDateTime)
            .tz("America/New_York")
            .format("YYYY-MM-DDTHH:mm:ssZ")
        : null,
      Remind_At: startDateTime
        ? dayjs(startDateTime)
            .subtract(1, "hour")
            .tz("America/New_York")
            .format("YYYY-MM-DDTHH:mm:ssZ")
        : null,
      Description: dealData?.Description || "",
      $se_module: "Candidates",
      $u_id: candidate?.id,
    };

    try {
      const fetchResp = await ZOHO.CRM.API.insertRecord({
        Entity: "Events",
        APIData: meetingDetails,
        Trigger: ["workflow", "blueprint"],
      });

      if (fetchResp?.data?.[0]?.code === "SUCCESS") {
        const id = fetchResp?.data?.[0]?.details?.id;
        ZOHO.CRM.UI.Popup.closeReload().then(function (data) {
          console.log(data);
        });
        window.open(
          `https://crm.zoho.com/crm/org824888839/tab/Events/${id}`,
          "_blank"
        );
      } else {
        console.error("Error in API Response:", fetchResp);
      }
    } catch (error) {
      console.error("Error inserting meeting:", error);
    }
  };

  useEffect(() => {
    ZOHO.embeddedApp.on("PageLoad", function (data) {
      setInitialized(true);
      setEntity(data?.Entity);
      setEntityID(data?.EntityId?.[0]);
      ZOHO.CRM.UI.Resize({ height: "75%", width: "25%" });
    });

    ZOHO.embeddedApp.init();
  }, []);

  useEffect(() => {
    if (initialized) {
      const fetchData = async () => {
        try {
          const dealResp = await ZOHO.CRM.API.getRecord({
            Entity: entity,
            approved: "both",
            RecordID: entityID,
          });

          setDealData(dealResp?.data?.[0]);
        } catch (error) {
          console.error("Error fetching deal data:", error);
        }
      };

      fetchData();
    }
  }, [initialized, entity, entityID]);

  useEffect(() => {
    if (initialized && dealData?.Candidate) {
      const fetchData = async () => {
        try {
          const candidateResp = await ZOHO.CRM.API.getRecord({
            Entity: "Candidates",
            approved: "both",
            RecordID: dealData?.Candidate?.id,
          });

          setCandidate(candidateResp?.data?.[0]);
        } catch (error) {
          console.error("Error fetching candidate data:", error);
        }
      };

      fetchData();
    }
  }, [initialized, dealData]);

  useEffect(() => {
    if (initialized && dealData?.Contact_Name) {
      const fetchData = async () => {
        try {
          const contactResp = await ZOHO.CRM.API.getRecord({
            Entity: "Contacts",
            approved: "both",
            RecordID: dealData?.Contact_Name?.id,
          });

          setContact(contactResp?.data?.[0]);
        } catch (error) {
          console.error("Error fetching contact data:", error);
        }
      };

      fetchData();
    }
  }, [initialized, dealData]);
  console.log("contact", contact);
  console.log("candidate", candidate);
  useEffect(() => {
    if (dealData) {
      setTitle(
        `Meeting with ${dealData?.Account_Name?.name || ""} & ${
          candidate?.Name || ""
        } - ${dealData?.Deal_Name || ""}`
      );
    }
  }, [dealData, candidate]);

  if (dealData) {
    return (
      <Box
        pt={2}
        sx={{
          width: "500px",
          height: "500px",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          margin: "auto",
        }}
      >
        <TextField
          fullWidth
          size="small"
          label="Title *"
          sx={{ pb: "14px" }}
          value={title}
          onChange={(e) => {
            const newValue = e.target.value;
            setTitle(newValue);
            if (newValue.trim() === "") {
              setErrorTitle(true);
            } else {
              setErrorTitle(false); // Reset error on change if input is valid
            }
          }}
          error={errorTitle}
          helperText={errorTitle ? "Title is required" : ""}
        />
        <TextField
          fullWidth
          size="small"
          label="Location *"
          sx={{}}
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setErrorLocation(false); // Reset error on change
          }}
          error={errorLocation}
          helperText={errorLocation ? "Location is required" : ""}
        />
        <h4>Meeting Time</h4>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              width: "250px",
            }}
          >
            <DateTimePicker
              label="Start Date-Time"
              value={startDateTime}
              onChange={handleStartChange}
              slotProps={{
                textField: {
                  size: "small",
                  required: true,
                  error: errorStartDateTime && !startDateTime, // Mark as error if no start date-time and error is true
                  helperText:
                    errorStartDateTime && !startDateTime
                      ? "Start Date-Time is required"
                      : "", // Display error message if applicable
                },
              }}
            />
            <DateTimePicker
              label="End Date-Time"
              value={endDateTime}
              onChange={(newValue) => {
                // Call your existing handleEndChange to manage the end date-time update logic
                handleEndChange(newValue);

                // Check if the end date-time is before the start date-time
                if (
                  startDateTime &&
                  newValue &&
                  (dayjs(newValue).isBefore(dayjs(startDateTime)) ||
                    dayjs(newValue).isSame(dayjs(startDateTime)))
                ) {
                  setErrorEndDateTime(true);
                } else {
                  setErrorEndDateTime(false);
                }
              }}
              slotProps={{
                textField: {
                  size: "small",
                  required: true,
                  error: errorEndDateTime, // Mark as error if the condition is met
                  helperText: errorEndDateTime
                    ? "End Date-Time cannot be before or, same as Start Date-Time"
                    : "", // Show the appropriate error message
                },
              }}
            />
          </div>
        </LocalizationProvider>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setSnackbarOpen(false)}
            >
              CLOSE
            </Button>
          }
          sx={{
            "& .MuiSnackbarContent-root": {
              backgroundColor: "red",
            },
          }}
        />

        <h4 style={{ textAlign: "left" }}>Description</h4>
        <TextField
          id="outlined-multiline-static"
          size="small"
          label="Description"
          multiline
          fullWidth
          value={`${dealData?.Deal_Name || ""} - ${
            dealData?.Description || ""
          }`}
          rows={2}
        />

        <h4 style={{ textAlign: "left" }}>Participants</h4>

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 200 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell size="small">Type</TableCell>
                <TableCell align="right" size="small">
                  Name
                </TableCell>
                <TableCell align="right" size="small">
                  Email
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {candidate && (
                <TableRow>
                  <TableCell size="small" component="th" scope="row">
                    Candidate
                  </TableCell>
                  <TableCell size="small" align="right">
                    {candidate.Name}
                  </TableCell>
                  <TableCell size="small" align="right">
                    {candidate.Email}
                  </TableCell>
                </TableRow>
              )}
              {contact && (
                <TableRow>
                  <TableCell size="small" component="th" scope="row">
                    Contact
                  </TableCell>
                  <TableCell size="small" align="right">
                    {dealData?.Contact_Name?.name}
                  </TableCell>
                  <TableCell size="small" align="right">
                    {contact?.Email}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: "flex", mt: 4 }}>
          <Box sx={{ width: "70%" }}>
            <Button
              onClick={() =>
                ZOHO.CRM.UI.Popup.closeReload().then(function (data) {
                  console.log(data);
                })
              }
              variant="contained"
              color="error"
              size="small"
            >
              Cancel
            </Button>
          </Box>
          <Box sx={{ width: "30%" }}>
            <Button
              onClick={handleCreateMeeting}
              variant="contained"
              size="small"
            >
              Create Meeting
            </Button>
          </Box>
        </Box>
      </Box>
    );
  } else {
    return (
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          margin: "auto",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
};

export default Meeting;
